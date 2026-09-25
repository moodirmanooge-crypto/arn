-- ============================================================================
-- MEDVORA — 04: STORAGE (sawirada) + FIXES
-- ============================================================================
-- Ku shub KADIB 01, 02, 03. Waa idempotent — mar kale haddii la run-gareeyo
-- wax ma jabiyo.
--
-- Wuxuu sameeyaa:
--   1) Wuxuu hagaajiyaa "infinite recursion" ee RLS-ka profiles
--      (helper functions → SECURITY DEFINER).
--   2) User-ku wuxuu akhrin karaa profile-kiisa xitaa ka hor organization.
--   3) Columns sawirada: products.image_url, organizations.logo_url,
--      profiles.avatar_url, expenses.receipt_url, customers.photo_url,
--      suppliers.logo_url.
--   4) Jadwal spec_progress — checklist-ka modules-ka hadda Supabase ayuu
--      ku kaydsamaa (horey wuxuu ahaa memory kaliya).
--   5) Storage bucket "medvora-media" + policies: organization kasta wuxuu
--      upload/tirtiri karaa oo keliya folder-kiisa  <organization_id>/...
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) Helper functions — SECURITY DEFINER si aysan RLS u wareegin (recursion)
-- ---------------------------------------------------------------------------

create or replace function auth_organization_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select organization_id from public.profiles where id = auth.uid()
$$;

create or replace function auth_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid()
$$;

grant execute on function auth_organization_id() to authenticated;
grant execute on function auth_role() to authenticated;

-- ---------------------------------------------------------------------------
-- 2) Profiles: qofku had iyo jeer wuu arki karaa row-giisa
-- ---------------------------------------------------------------------------

drop policy if exists "profiles: read self" on profiles;
create policy "profiles: read self" on profiles
  for select using (id = auth.uid());

-- ---------------------------------------------------------------------------
-- 3) Columns sawirada / faylasha
-- ---------------------------------------------------------------------------

alter table products      add column if not exists image_url   text;
alter table products      add column if not exists image_path  text;
alter table organizations add column if not exists logo_url    text;
alter table organizations add column if not exists logo_path   text;
alter table profiles      add column if not exists avatar_url  text;
alter table profiles      add column if not exists avatar_path text;
alter table expenses      add column if not exists receipt_url  text;
alter table expenses      add column if not exists receipt_path text;
alter table customers     add column if not exists photo_url   text;
alter table customers     add column if not exists photo_path  text;
alter table suppliers     add column if not exists logo_url    text;
alter table suppliers     add column if not exists logo_path   text;

-- Expenses: taariikhda kharashka (ikhtiyaari)
alter table expenses add column if not exists expense_date date default current_date;

-- ---------------------------------------------------------------------------
-- 4) spec_progress — checklist-ka Master Specification (per organization)
-- ---------------------------------------------------------------------------

create table if not exists spec_progress (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id) on delete cascade,
  module_id text not null,
  item text not null,
  checked_by uuid references profiles(id) default auth.uid(),
  created_at timestamptz not null default now(),
  unique (organization_id, module_id, item)
);

create index if not exists spec_progress_org_module_idx
  on spec_progress (organization_id, module_id);

alter table spec_progress enable row level security;

drop policy if exists "spec_progress: same org" on spec_progress;
create policy "spec_progress: same org" on spec_progress
  for all using (organization_id = auth_organization_id() or auth_role() = 'super_admin')
  with check (organization_id = auth_organization_id() or auth_role() = 'super_admin');

-- ---------------------------------------------------------------------------
-- 5) STORAGE — bucket "medvora-media"
--    Qaabka path-ka:  <organization_id>/<folder>/<uuid>.<ext>
--    Tusaale:         9f1c.../products/2b7e....jpg
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'medvora-media',
  'medvora-media',
  true,                                   -- public URL si sawirada loo muujiyo
  5242880,                                -- 5 MB per file
  array['image/jpeg','image/png','image/webp','image/gif','application/pdf']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "medvora-media: read"   on storage.objects;
drop policy if exists "medvora-media: insert" on storage.objects;
drop policy if exists "medvora-media: update" on storage.objects;
drop policy if exists "medvora-media: delete" on storage.objects;

create policy "medvora-media: read" on storage.objects
  for select using (bucket_id = 'medvora-media');

create policy "medvora-media: insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'medvora-media'
    and (storage.foldername(name))[1] = auth_organization_id()::text
  );

create policy "medvora-media: update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'medvora-media'
    and (storage.foldername(name))[1] = auth_organization_id()::text
  );

create policy "medvora-media: delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'medvora-media'
    and (storage.foldername(name))[1] = auth_organization_id()::text
  );
