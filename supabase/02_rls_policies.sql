-- ============================================================================
-- MEDVORA — ROW LEVEL SECURITY (Phase 1)
-- ============================================================================
-- Ku shubo KADIB 01_schema.sql. Fikradda guud:
--   - qof kastaa wuxuu arki karaa oo keliya xogta organization-kiisa
--     (profiles.organization_id == row.organization_id)
--   - super_admin ayaa arki kara dhammaan (loo isticmaalo Super Admin panel)
-- ============================================================================

-- Helper: ku soo celi organization_id + role ee user-ka hadda soo galay
create or replace function auth_organization_id()
returns uuid
language sql stable
as $$
  select organization_id from profiles where id = auth.uid()
$$;

create or replace function auth_role()
returns text
language sql stable
as $$
  select role from profiles where id = auth.uid()
$$;

-- Enable RLS on every tenant-scoped table
alter table organizations   enable row level security;
alter table branches        enable row level security;
alter table profiles        enable row level security;
alter table categories      enable row level security;
alter table products        enable row level security;
alter table stock_batches   enable row level security;
alter table stock_movements enable row level security;
alter table customers       enable row level security;
alter table suppliers       enable row level security;
alter table purchase_orders enable row level security;
alter table purchase_items  enable row level security;
alter table sales           enable row level security;
alter table sale_items      enable row level security;
alter table payments        enable row level security;
alter table expenses        enable row level security;
alter table audit_logs      enable row level security;

-- organizations: a member can read/update only their own org; super_admin sees all
create policy "org: read own or super_admin" on organizations
  for select using (id = auth_organization_id() or auth_role() = 'super_admin');
create policy "org: update own owner" on organizations
  for update using (id = auth_organization_id() and auth_role() in ('organization_owner','super_admin'));

-- profiles: read colleagues in the same org; users can update their own row
create policy "profiles: read same org" on profiles
  for select using (organization_id = auth_organization_id() or auth_role() = 'super_admin');
create policy "profiles: update self" on profiles
  for update using (id = auth.uid());

-- Generic pattern for every other tenant-scoped table: full access within your org.
-- (Repeat per table because Postgres policies are not inherited.)

create policy "branches: same org" on branches
  for all using (organization_id = auth_organization_id() or auth_role() = 'super_admin');

create policy "categories: same org" on categories
  for all using (organization_id = auth_organization_id() or auth_role() = 'super_admin');

create policy "products: same org" on products
  for all using (organization_id = auth_organization_id() or auth_role() = 'super_admin');

create policy "stock_batches: same org" on stock_batches
  for all using (organization_id = auth_organization_id() or auth_role() = 'super_admin');

create policy "stock_movements: same org" on stock_movements
  for all using (organization_id = auth_organization_id() or auth_role() = 'super_admin');

create policy "customers: same org" on customers
  for all using (organization_id = auth_organization_id() or auth_role() = 'super_admin');

create policy "suppliers: same org" on suppliers
  for all using (organization_id = auth_organization_id() or auth_role() = 'super_admin');

create policy "purchase_orders: same org" on purchase_orders
  for all using (organization_id = auth_organization_id() or auth_role() = 'super_admin');

create policy "purchase_items: via parent order" on purchase_items
  for all using (
    exists (
      select 1 from purchase_orders po
      where po.id = purchase_items.purchase_order_id
      and (po.organization_id = auth_organization_id() or auth_role() = 'super_admin')
    )
  );

create policy "sales: same org" on sales
  for all using (organization_id = auth_organization_id() or auth_role() = 'super_admin');

create policy "sale_items: via parent sale" on sale_items
  for all using (
    exists (
      select 1 from sales s
      where s.id = sale_items.sale_id
      and (s.organization_id = auth_organization_id() or auth_role() = 'super_admin')
    )
  );

create policy "payments: same org" on payments
  for all using (organization_id = auth_organization_id() or auth_role() = 'super_admin');

create policy "expenses: same org" on expenses
  for all using (organization_id = auth_organization_id() or auth_role() = 'super_admin');

create policy "audit_logs: same org, read only" on audit_logs
  for select using (organization_id = auth_organization_id() or auth_role() = 'super_admin');
create policy "audit_logs: insert own org" on audit_logs
  for insert with check (organization_id = auth_organization_id());

-- ---------------------------------------------------------------------------
-- Auto-create a profile row whenever someone signs up via Supabase Auth
-- ---------------------------------------------------------------------------

create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email), 'staff');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();