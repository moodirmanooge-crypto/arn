-- ============================================================================
-- MEDVORA — CORE SUPABASE SCHEMA (Phase 1)
-- ============================================================================
-- Ku shubo Supabase Dashboard > SQL Editor, kaddibna "Run".
--
-- Wuxuu daboolayaa qaybaha aasaasiga ah ee Master Specification:
--   §3  Multi-Tenant SaaS      §4  Authentication (uses Supabase Auth)
--   §5  Users & Roles          §6  Pharmacy / Branch
--   §7  Medicine/Product Master §9 Inventory
--   §13 Customer Management    §14 Supplier Management
--   §10 Purchasing             §11 Sales / POS
--   §16 Expenses               §40 Audit & Security
--
-- Qaybaha kale (Clinical §20-27, Lab §22-23, Accounting §17-19, Reports §28)
-- waxay ku dhisan yihiin jaduallakan — waxaa lagu dari karaa isla qaabkan
-- marka la gaadho phase-ka xiga.
-- ============================================================================

create extension if not exists "uuid-ossp";

-- ---------------------------------------------------------------------------
-- §3 MULTI-TENANT SAAS
-- ---------------------------------------------------------------------------

create table organizations (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  subscription_plan text not null default 'trial' check (subscription_plan in ('trial','basic','professional','enterprise')),
  subscription_status text not null default 'active' check (subscription_status in ('active','past_due','cancelled')),
  trial_ends_at timestamptz,
  currency text not null default 'USD',
  created_at timestamptz not null default now()
);

create table branches (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  address text,
  phone text,
  opening_time time,
  closing_time time,
  is_main boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- §5 USERS & ROLES  (auth.users is managed by Supabase Auth; this extends it)
-- ---------------------------------------------------------------------------

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  organization_id uuid references organizations(id) on delete cascade,
  branch_id uuid references branches(id),
  full_name text not null,
  role text not null default 'staff' check (
    role in ('super_admin','organization_owner','manager','pharmacist',
             'pharmacy_technician','cashier','lab_technician','nurse','doctor',
             'accountant','staff')
  ),
  phone text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- §7 MEDICINE / PRODUCT MASTER
-- ---------------------------------------------------------------------------

create table categories (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  parent_id uuid references categories(id)
);

create table products (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id) on delete cascade,
  category_id uuid references categories(id),
  name text not null,
  generic_name text,
  brand_name text,
  active_ingredients text,
  strength text,
  dosage_form text,
  manufacturer text,
  country_of_origin text,
  sku text,
  barcode text,
  unit text not null default 'piece',
  purchase_price numeric(12,2) not null default 0,
  selling_price numeric(12,2) not null default 0,
  wholesale_price numeric(12,2),
  reorder_level integer not null default 0,
  is_prescription_only boolean not null default false,
  is_controlled boolean not null default false,
  registration_number text,
  status text not null default 'active' check (status in ('active','inactive','discontinued')),
  created_at timestamptz not null default now(),
  unique (organization_id, barcode)
);

-- ---------------------------------------------------------------------------
-- §9 INVENTORY
-- ---------------------------------------------------------------------------

create table stock_batches (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id) on delete cascade,
  branch_id uuid not null references branches(id) on delete cascade,
  product_id uuid not null references products(id) on delete cascade,
  batch_number text,
  quantity numeric(12,2) not null default 0,
  expiry_date date,
  received_at timestamptz not null default now()
);

create table stock_movements (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id) on delete cascade,
  branch_id uuid not null references branches(id) on delete cascade,
  product_id uuid not null references products(id) on delete cascade,
  batch_id uuid references stock_batches(id),
  movement_type text not null check (
    movement_type in ('purchase','sale','adjustment','transfer_in','transfer_out',
                       'return','damaged','expired')
  ),
  quantity numeric(12,2) not null,
  reference_type text,
  reference_id uuid,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- §13 CUSTOMERS   §14 SUPPLIERS
-- ---------------------------------------------------------------------------

create table customers (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  phone text,
  address text,
  customer_type text not null default 'individual' check (customer_type in ('individual','company')),
  credit_limit numeric(12,2) not null default 0,
  balance numeric(12,2) not null default 0,
  created_at timestamptz not null default now()
);

create table suppliers (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  phone text,
  address text,
  balance numeric(12,2) not null default 0,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- §10 PURCHASING
-- ---------------------------------------------------------------------------

create table purchase_orders (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id) on delete cascade,
  branch_id uuid not null references branches(id) on delete cascade,
  supplier_id uuid not null references suppliers(id),
  status text not null default 'pending' check (status in ('pending','partial','received','cancelled')),
  total_amount numeric(12,2) not null default 0,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

create table purchase_items (
  id uuid primary key default uuid_generate_v4(),
  purchase_order_id uuid not null references purchase_orders(id) on delete cascade,
  product_id uuid not null references products(id),
  quantity numeric(12,2) not null,
  unit_cost numeric(12,2) not null,
  received_quantity numeric(12,2) not null default 0
);

-- ---------------------------------------------------------------------------
-- §11 SALES / POS
-- ---------------------------------------------------------------------------

create table sales (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id) on delete cascade,
  branch_id uuid not null references branches(id) on delete cascade,
  customer_id uuid references customers(id),
  invoice_number text not null,
  subtotal numeric(12,2) not null default 0,
  discount numeric(12,2) not null default 0,
  tax numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  payment_status text not null default 'paid' check (payment_status in ('paid','partial','unpaid','refunded')),
  payment_method text not null default 'cash' check (payment_method in ('cash','evc_plus','edahab','bank','card','credit','mixed')),
  status text not null default 'completed' check (status in ('completed','cancelled','returned')),
  cashier_id uuid references profiles(id),
  created_at timestamptz not null default now(),
  unique (organization_id, invoice_number)
);

create table sale_items (
  id uuid primary key default uuid_generate_v4(),
  sale_id uuid not null references sales(id) on delete cascade,
  product_id uuid not null references products(id),
  batch_id uuid references stock_batches(id),
  quantity numeric(12,2) not null,
  unit_price numeric(12,2) not null,
  discount numeric(12,2) not null default 0,
  total numeric(12,2) not null
);

create table payments (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id) on delete cascade,
  sale_id uuid references sales(id),
  purchase_order_id uuid references purchase_orders(id),
  amount numeric(12,2) not null,
  method text not null default 'cash',
  reference text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- §16 EXPENSES
-- ---------------------------------------------------------------------------

create table expenses (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id) on delete cascade,
  branch_id uuid references branches(id),
  category text not null,
  amount numeric(12,2) not null,
  note text,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- §40 AUDIT & SECURITY
-- ---------------------------------------------------------------------------

create table audit_logs (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid references organizations(id) on delete cascade,
  user_id uuid references profiles(id),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  details jsonb,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Helpful indexes
-- ---------------------------------------------------------------------------

create index on branches (organization_id);
create index on profiles (organization_id);
create index on products (organization_id);
create index on stock_batches (organization_id, branch_id, product_id);
create index on stock_movements (organization_id, branch_id, product_id);
create index on customers (organization_id);
create index on suppliers (organization_id);
create index on purchase_orders (organization_id, branch_id);
create index on sales (organization_id, branch_id, created_at);
create index on sale_items (sale_id);
create index on expenses (organization_id, branch_id);
create index on audit_logs (organization_id, created_at);