-- УСТАРЕЛО / SUPERSEDED: используйте supabase/fix-admin-owner.sql (он пинит
-- immutable owner UUID + role + email). Этот файл оставлен для истории; email
-- владельца здесь уже исправлен на alekberov.ceyhun2002@gmail.com, чтобы не был footgun.
--
-- Elva LaVenta — строгая защита панели администратора.
-- Запустить ОДИН раз: Supabase → SQL Editor → New query → вставить весь файл → Run.
-- После выполнения административный доступ через RLS будет только у указанной почты.

update public.profiles
set role = 'admin'
where id in (
  select id
  from auth.users
  where lower(email) = 'alekberov.ceyhun2002@gmail.com'
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  )
  and lower(coalesce(auth.jwt() ->> 'email', '')) = 'alekberov.ceyhun2002@gmail.com';
$$;

-- Проверка: запрос должен вернуть ровно одну строку с role = admin.
select u.email, p.role
from auth.users u
join public.profiles p on p.id = u.id
where lower(u.email) = 'alekberov.ceyhun2002@gmail.com';
