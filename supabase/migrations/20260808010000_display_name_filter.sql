-- Vendor display-name content filter.
--
-- display_name is a client-writable column (it is in the authenticated UPDATE
-- column grant so the setup screen can save it), which means a form-only check
-- is cosmetic — anyone can PATCH the row directly. The database is therefore
-- the enforcement point; the RPC below exists only to give the setup screen a
-- friendly message before submitting.
--
-- Terms live in a TABLE, not in this function body, so the owner can add or
-- remove words with a single INSERT/DELETE — no migration, no deploy.
--
-- Two match modes, because substring matching alone is the classic Scunthorpe
-- trap and this audience's real names would trip it:
--   'substring' — unambiguous; matched anywhere, after evasion-normalisation
--                 ("f.u.c.k", "fuuuck", "f4ck" all collapse to the same thing).
--   'word'      — matched only as a whole word, for terms that legitimately
--                 appear inside real names ('spic' inside "Spiceify", 'anal'
--                 inside "Anala", 'ass' inside "Cassandra", 'dick'/'cock' as
--                 surnames). These would otherwise ban existing players.
--
-- Deliberately NOT filtered: Trini dialect and mild slang ("mudda", "bacchanal",
-- "hell", "damn"). This is a Trinidadian street-food game — the vernacular is
-- the charm, and over-filtering it would read as broken, not safe.

create table if not exists public.banned_name_terms (
  term text primary key,
  match_type text not null default 'substring' check (match_type in ('substring', 'word')),
  created_at timestamptz not null default now()
);

alter table public.banned_name_terms enable row level security;
revoke all on public.banned_name_terms from anon, authenticated;
grant all on public.banned_name_terms to service_role;

-- Tight normalisation for substring matching: fold leetspeak, drop every
-- non-alphanumeric (so "f-u-c-k" and "f u c k" collapse), then collapse runs of
-- the same letter ("fuuuck" -> "fuck"). Note this also folds "Shaanjahan" to
-- "shanjahan", which is harmless — it only ever feeds the blocklist compare.
create or replace function public.norm_name_tight(p_name text)
returns text
language sql
immutable
as $$
  select regexp_replace(
           regexp_replace(
             translate(lower(coalesce(p_name, '')),
                       '0134577@$!¡|', 'oieasstasil'),
             '[^a-z0-9]', '', 'g'),
           '(.)\1+', '\1', 'g');
$$;

-- Flat normalisation: fold leetspeak and drop non-alphanumerics, but do NOT
-- collapse repeated letters. Needed because run-collapsing is lossy in both
-- directions — it is what lets "fuuuck" be caught, but it also reduces a term
-- like "kkk" to a bare "k", which would then match any name containing that
-- letter (it briefly banned "Cocktail Kid" and "Singhs trini cooking").
create or replace function public.norm_name_flat(p_name text)
returns text
language sql
immutable
as $$
  select regexp_replace(
           translate(lower(coalesce(p_name, '')),
                     '0134577@$!¡|', 'oieasstasil'),
           '[^a-z0-9]', '', 'g');
$$;

-- Word-mode normalisation: same folding, but separators become spaces so
-- whole-word boundaries survive ("Rectum Ranger" -> "rectum ranger").
--
-- Runs BEFORE lowercasing: a camelCase boundary ("BigDickEnergy") and a
-- letter/digit boundary ("Dick69") are split into separate words, otherwise
-- squashing everything into one token lets a whole-word term be evaded by
-- simply deleting the space. Genuine surnames keep their single token
-- ("Dickson" has no internal capital, so it stays one word and is not hit).
create or replace function public.norm_name_words(p_name text)
returns text
language sql
immutable
as $$
  select btrim(regexp_replace(
           regexp_replace(
             translate(
               lower(
                 regexp_replace(
                   regexp_replace(
                     regexp_replace(coalesce(p_name, ''), '([a-z])([A-Z])', '\1 \2', 'g'),
                     '([a-zA-Z])([0-9])', '\1 \2', 'g'),
                   '([0-9])([a-zA-Z])', '\1 \2', 'g')),
               '0134577@$!¡|', 'oieasstasil'),
             '[^a-z0-9]+', ' ', 'g'),
           '\s+', ' ', 'g'));
$$;

-- True when a name trips the blocklist.
create or replace function public.display_name_blocked(p_name text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  -- The TERM is normalised with the same function as the name. Without this,
  -- run-collapsing silently disarms every term containing a double letter:
  -- a dollar-sign-obfuscated "asshole" folds to "ashole" while the stored term
  -- stays "asshole", and "N1gga" folds to "niga" while the term stays "nigga" —
  -- both would sail straight through.
  -- (NB: never write a literal double-dollar in this file; it would close the
  -- dollar-quoted function body mid-comment.)
  -- Substring terms are tested twice:
  --   1. FLAT vs FLAT — the faithful comparison. Catches spacing/punctuation/
  --      leet evasion, and terms whose own letters repeat ("kkk").
  --   2. TIGHT vs TIGHT — both sides run-collapsed, which is what catches
  --      letter-padding ("fuuuck"). Skipped when collapsing shrinks the term
  --      below 3 characters, since such a stub matches almost everything.
  -- Word terms use the non-collapsing word normaliser, so they need neither.
  select exists (
    select 1 from public.banned_name_terms t
    where (t.match_type = 'substring'
           and (public.norm_name_flat(p_name) like '%' || public.norm_name_flat(t.term) || '%'
                or (length(public.norm_name_tight(t.term)) >= 3
                    and public.norm_name_tight(p_name) like '%' || public.norm_name_tight(t.term) || '%')))
       or (t.match_type = 'word'
           and public.norm_name_words(p_name) ~ ('\m' || public.norm_name_words(t.term) || '\M'))
  );
$$;

-- Guard: reject a banned name at write time.
-- CRITICAL: only validate when display_name is actually being set or changed.
-- Checking on every UPDATE would mean any player already holding a flagged name
-- could never save a round, buy a business, or claim a reward again — the
-- filter would brick their account instead of just their name.
create or replace function public.players_display_name_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' and new.display_name is not distinct from old.display_name then
    return new;
  end if;
  if new.display_name is not null and public.display_name_blocked(new.display_name) then
    raise exception 'display_name_not_allowed'
      using hint = 'That vendor name is not allowed. Try another one.';
  end if;
  return new;
end;
$$;

drop trigger if exists players_display_name_guard on public.players;
create trigger players_display_name_guard
  before insert or update on public.players
  for each row execute function public.players_display_name_guard();

-- Setup-screen pre-check: one call returns both failure modes so the UI can say
-- which it is. { ok, reason: 'taken' | 'not_allowed' | 'too_short' | null }
create or replace function public.display_name_check(p_name text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_name text := btrim(coalesce(p_name, ''));
begin
  if length(v_name) < 2 then
    return jsonb_build_object('ok', false, 'reason', 'too_short');
  end if;
  if public.display_name_blocked(v_name) then
    return jsonb_build_object('ok', false, 'reason', 'not_allowed');
  end if;
  if exists (
    select 1 from public.players
    where lower(trim(display_name)) = lower(v_name)
      and user_id is distinct from auth.uid()
  ) then
    return jsonb_build_object('ok', false, 'reason', 'taken');
  end if;
  return jsonb_build_object('ok', true, 'reason', null);
end;
$$;

revoke all on function public.display_name_check(text) from public, anon;
grant execute on function public.display_name_check(text) to authenticated;
revoke all on function public.display_name_blocked(text) from public, anon;
grant execute on function public.display_name_blocked(text) to authenticated;

-- Keep the older boolean RPC honest for any client still calling it: a blocked
-- name must not read as "available".
create or replace function public.display_name_available(p_name text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select not public.display_name_blocked(p_name)
     and not exists (
       select 1 from public.players
       where lower(trim(display_name)) = lower(trim(coalesce(p_name, '')))
         and user_id is distinct from auth.uid()
     );
$$;

-- ---- seed list ----
insert into public.banned_name_terms (term, match_type) values
  -- Unambiguous: safe to match anywhere inside the name.
  ('fuck','substring'), ('fuk','substring'), ('fck','substring'),
  ('fack','substring'), ('phuck','substring'), ('phuk','substring'),
  ('shit','substring'), ('cunt','substring'), ('bitch','substring'),
  ('bastard','substring'), ('whore','substring'), ('slut','substring'),
  ('nigger','substring'), ('nigga','substring'), ('faggot','substring'),
  ('tranny','substring'), ('chink','substring'), ('wetback','substring'),
  ('retard','substring'), ('rapist','substring'), ('pedo','substring'),
  ('paedo','substring'), ('molest','substring'), ('incest','substring'),
  ('bestial','substring'), ('nazi','substring'), ('hitler','substring'),
  ('kkk','substring'), ('pussy','substring'), ('penis','substring'),
  ('vagina','substring'), ('scrotum','substring'), ('rectum','substring'),
  ('asshole','substring'), ('arsehole','substring'), ('motherfuck','substring'),
  ('wanker','substring'), ('bollock','substring'), ('twat','substring'),
  ('blowjob','substring'), ('handjob','substring'), ('cocksuck','substring'),
  ('dildo','substring'), ('ejacul','substring'), ('masturbat','substring'),
  ('jizz','substring'), ('porn','substring'), ('dickhead','substring'),
  -- Whole-word only: these appear inside legitimate names.
  ('ass','word'), ('arse','word'), ('anal','word'), ('anus','word'),
  ('cum','word'), ('semen','word'), ('tit','word'), ('tits','word'),
  ('boob','word'), ('boobs','word'), ('dick','word'), ('cock','word'),
  ('prick','word'), ('fag','word'), ('dyke','word'), ('spic','word'),
  ('coon','word'), ('gook','word'), ('rape','word'), ('hoe','word')
on conflict (term) do nothing;
