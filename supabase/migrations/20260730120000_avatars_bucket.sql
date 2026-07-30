-- Public Storage bucket for rehosted tester avatars. The Base44 Player export
-- stores avatar images as media.base44.com CDN URLs, which die when Base44 is
-- torn down. scripts/rehost-avatars.ts copies each tester's image here (keyed by
-- Base44 created_by_id) BEFORE cancellation, and seed-testers.ts writes the
-- Storage public URL into players.avatar_emoji instead of the dead CDN link.
--
-- Public bucket => objects are readable via the public URL with no policy;
-- uploads happen through service_role (which bypasses storage RLS).
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update set public = true;
