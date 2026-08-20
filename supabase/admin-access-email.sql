-- УСТАРЕЛО / SUPERSEDED: используйте supabase/fix-admin-owner.sql.
-- Elva LaVenta: выдаёт права админки указанному Gmail.
-- Запустить один раз: Supabase → SQL Editor → New query → Run.

update public.profiles
set role = 'admin'
where id in (
  select id
  from auth.users
  where lower(email) = 'olegperov2002@gmail.com'
);

-- Проверка результата:
select p.role, u.email
from public.profiles p
join auth.users u on u.id = p.id
where lower(u.email) = 'olegperov2002@gmail.com';
