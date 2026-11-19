-- Run only from the trusted Supabase SQL Editor after creating the Auth user.
-- Replace the UUID marker with the exact ID from Authentication > Users.
-- This intentionally fails if the marker is unchanged, the user does not
-- exist, or a role row already exists. It never replaces an existing role.
do $$
declare
  target_user_id uuid := '<AUTH_USER_UUID>';
begin
  if not exists (
    select 1 from auth.users where id = target_user_id
  ) then
    raise exception 'Auth user % does not exist; no role assigned', target_user_id;
  end if;

  if exists (
    select 1 from public.user_roles where user_id = target_user_id
  ) then
    raise exception 'A role already exists for %; inspect it instead of replacing it', target_user_id;
  end if;

  insert into public.user_roles (user_id, role)
  values (target_user_id, 'owner'::public.user_role);
end
$$;

-- Verify by pasting the same UUID after the transaction succeeds.
select user_id, role, created_at
from public.user_roles
where user_id = '<AUTH_USER_UUID>'::uuid;
