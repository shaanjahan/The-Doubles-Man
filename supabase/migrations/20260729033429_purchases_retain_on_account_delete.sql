-- Retain purchase records when an account is deleted (Apple 5.1.1(v) account
-- deletion + tax/accounting retention).
--
-- purchases.owner_id was ON DELETE CASCADE, which would DELETE the financial
-- records when the auth user is deleted. Base44 instead RETAINS purchases
-- (de-identified) for tax/accounting. Switch the FK to ON DELETE SET NULL and
-- make owner_id nullable, so deleting the auth user auto-de-identifies each
-- purchase (owner_id -> NULL) while retaining checkout_id / product_id / amount
-- / status / created_at. owner_id is the only user link in this table, so
-- NULLing it fully de-identifies the row.

alter table public.purchases alter column owner_id drop not null;

alter table public.purchases drop constraint if exists purchases_owner_id_fkey;
alter table public.purchases
  add constraint purchases_owner_id_fkey
  foreign key (owner_id) references auth.users(id) on delete set null;
