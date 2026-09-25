# Medvora — Master Specification Browser + Supabase Backend

React + Vite app oo leh:
- Spec browser (56-ka module ee Master Specification, search, checklist)
- **Backend dhab ah oo Supabase ah**: authentication, multi-tenant database,
  iyo bog `Products` oo si toos ah ugu shaqeeya (live CRUD).

## 1) Samee Supabase project

1. Tag [supabase.com](https://supabase.com) → **New project**.
2. Marka uu diyaar noqdo, aad **Project Settings → API** oo koobiyee:
   - `Project URL`
   - `anon public` key

## 2) Ku shub schema-ga database-ka

Aad **SQL Editor** Supabase dashboard-kaaga, kaddibna hal-hal ku shub oo run:

1. `supabase/01_schema.sql` — jadwallada (organizations, branches, products,
   inventory, customers, suppliers, purchases, sales/POS, expenses, audit).
2. `supabase/02_rls_policies.sql` — Row Level Security (tenant isolation) +
   trigger-ka si automatic ah profile-ka loogu abuuro marka qof isdiiwaan geliyo.
3. `supabase/03_onboarding.sql` — `create_organization_and_join` (organization
   cusub + owner role, si ammaan ah).
4. `supabase/04_storage_and_fixes.sql` — **Storage bucket `medvora-media`**
   (sawirada/rasiidyada), columns sawirada (`image_url`, `logo_url`,
   `avatar_url`, `receipt_url`, `photo_url`), jadwalka `spec_progress`
   (checklist-ka), iyo hagaajinta RLS recursion-ka ee `profiles`.

## 3) Xir app-ka Supabase

```bash
cp .env.example .env
```

Fadlan ku beddel `.env`:

```
VITE_SUPABASE_URL=<Project URL-kaaga>
VITE_SUPABASE_ANON_KEY=<anon key-gaaga>
```

## 4) Order & isticmaal

```bash
npm install
npm run dev
```

Fur http://localhost:5173. Waxaad la kulmi doontaa bog **Sign up** — samee
akoon (email + password). Marka aad gasho:

- Trigger-ku wuxuu si otomaatig ah kuu abuurayaa row `profiles`.
- Waa inaad `organization` u xirtaa profile-kaaga si aad xogta u geli karto
  (arag qaybta 5 hoos).
- Booga **Products (Supabase)** dhinaca bidix — halkaas ku dar/tirtir alaab,
  waxaad arki doontaa in ay si toos ah ugu kaydsamayso Supabase.

## 5) Organization — hadda waa otomaatig

Marka user cusub uu soo galo, app-ku wuxuu tusayaa bogga **Onboarding** →
magaca organization-ka geli → wuxuu si otomaatig ah kuu sameynayaa
organization + Main Branch + role `organization_owner`.

## 6) Meesha xogta ku kaydsanto

| Bog | Jadwal Supabase | Sawir / fayl (Storage) |
|---|---|---|
| Products / Medicines | `products` | `<org_id>/products/…` |
| Categories | `categories` | — |
| Customers | `customers` | `<org_id>/customers/…` |
| Suppliers | `suppliers` | `<org_id>/suppliers/…` |
| Branches | `branches` | — |
| Expenses | `expenses` | `<org_id>/expenses/…` (sawir/PDF) |
| Settings | `profiles`, `organizations` | `<org_id>/avatars/…`, `<org_id>/logo/…` |
| Module checklist | `spec_progress` | — |

## (Hore) Xidhida organization-ka gacanta (haddii loo baahdo)

Marka aad markii ugu horreysay isdiiwaan gelayso, `profiles.organization_id`
wuu bannaan yahay (ma jiro organization weli). SQL Editor-ka ku qor:

```sql
insert into organizations (name) values ('Farmasiyada Tijaabada')
returning id;

-- ka koobiyee id-ga soo baxay, kaddibna:
update profiles set organization_id = '<id-kaas>', role = 'organization_owner'
where id = '<user id-kaaga, laga helo auth.users ama Authentication tab>';
```

Marka mustaqbalka la sameeyo bogga **Sign up flow** oo dhamaystiran, tani
si otomaatig ah ayay u dhici doontaa (organization cusub + owner role hal
mar).

## Qaab-dhismeedka

```
supabase/
  01_schema.sql        ← jadwallada aasaasiga ah
  02_rls_policies.sql  ← amniga xogta (tenant isolation)
src/
  lib/
    supabaseClient.js  ← xidhiidhka Supabase
    AuthContext.jsx    ← session, profile, signIn/signUp/signOut
  components/
    Layout.jsx          ← sidebar + Outlet
    ProtectedRoute.jsx  ← u yeer /login haddii aan la gelin
    Sidebar.jsx
  pages/
    Login.jsx
    Products.jsx        ← tusaale CRUD oo Supabase ah
    Dashboard.jsx        ← spec index (static)
    ModuleDetail.jsx      ← spec checklist (static)
  data/
    modules.js, groups.js ← xogta 56-da module (static, spec browser-ka)
```

## Tallaabada xigta

`01_schema.sql` wuxuu daboolayaa qaybaha aasaasiga ah (§3–§16, §40). Modules-ka
kale ee spec-ka — Clinical (§20–27), Laboratory (§22–23), Accounting (§17–19),
Reports/Dashboard (§28–29) — waxaa lagu dari karaa isla qaab-dhismeedkan:
jadwal cusub + RLS policy la mid ah tan jira, kaddibna bog React ah oo u eg
`Products.jsx`. Sheeg qaybta aad rabto inaan xigta ka bilowno.