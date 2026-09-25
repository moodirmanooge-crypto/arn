-- ============================================================================
-- MEDVORA — ONBOARDING (Phase 1, add-on)
-- ============================================================================
-- Ku shub KADIB 01_schema.sql iyo 02_rls_policies.sql.
--
-- Wuxuu ka saaraa mushkiladda: profile cusub wuxuu bilaabmaa isaga oo
-- organization_id = null. Halkan waxaan ku dhisaynaa hab AMMAAN AH oo
-- user-ku ku samayn karo organization cusub oo isaga isku xiri karo,
-- iyada oo aan qofna awoodin inuu si toos ah ugu dhex boodo organization
-- kale ama uu naftiisa u siiyo role sarreeya (privilege escalation).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) Xannib in profiles.organization_id / profiles.role laga beddelo
--    dhinaca client-ka si toos ah — kaliya function-ka hoose (SECURITY
--    DEFINER) ayaa awood u leh.
-- ---------------------------------------------------------------------------

create or replace function prevent_profile_privilege_escalation()
returns trigger
language plpgsql
as $$
begin
  if current_setting('app.bypass_privilege_check', true) = 'true' then
    return new;
  end if;

  if new.organization_id is distinct from old.organization_id
     or new.role is distinct from old.role then
    raise exception 'Kaliya nidaamka (create_organization_and_join) ayaa beddeli kara organization ama role';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_prevent_profile_privilege_escalation on profiles;
create trigger trg_prevent_profile_privilege_escalation
  before update on profiles
  for each row execute procedure prevent_profile_privilege_escalation();

-- ---------------------------------------------------------------------------
-- 2) Function-ka user-ku isticmaalo si uu u sameeyo organization + isku xiro
-- ---------------------------------------------------------------------------

create or replace function create_organization_and_join(
  org_name text,
  org_currency text default 'USD'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_org_id uuid;
  existing_org uuid;
begin
  select organization_id into existing_org from profiles where id = auth.uid();

  if existing_org is not null then
    raise exception 'Horaad ayaad organization ku xiran tahay';
  end if;

  if org_name is null or length(trim(org_name)) = 0 then
    raise exception 'Fadlan geli magaca organization-ka';
  end if;

  insert into organizations (name, currency, trial_ends_at)
  values (trim(org_name), coalesce(org_currency, 'USD'), now() + interval '14 days')
  returning id into new_org_id;

  perform set_config('app.bypass_privilege_check', 'true', true);

  update profiles
  set organization_id = new_org_id,
      role = 'organization_owner'
  where id = auth.uid();

  insert into branches (organization_id, name, is_main)
  values (new_org_id, trim(org_name) || ' — Main Branch', true);

  return new_org_id;
end;
$$;

grant execute on function create_organization_and_join(text, text) to authenticated;