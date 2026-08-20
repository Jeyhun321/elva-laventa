-- ============================================================
--  Elva LaVenta — SECURITY FIX: правильный единственный owner админки
--
--  Запустить ЦЕЛИКОМ: Supabase → SQL Editor → New query → вставить → Run.
--  ИДЕМПОТЕНТНО и безопасно (пользователей НЕ удаляет; только роли + is_admin()).
--
--  ПРИЧИНА БАГА:
--  Прежняя is_admin() (supabase/admin-lockdown.sql) была привязана к чужому email
--  `alekberov.ceyhun2002@gmail.com`, и этому аккаунту был выставлен
--  profiles.role='admin'. Поэтому обычный пользователь проходил серверный гейт и
--  открывал /admin. Настоящий владелец `olegperov2002@gmail.com` не был назначен.
--
--  ЧТО ДЕЛАЕТ ЭТА МИГРАЦИЯ (SERVER-SIDE, единственный source of truth):
--   1) находит immutable UUID владельца olegperov2002@gmail.com в auth.users;
--   2) снимает role='admin' у ВСЕХ, кроме владельца (в т.ч. у alekberov*);
--   3) гарантирует role='admin' владельцу (создаёт профиль, если его нет);
--   4) пересоздаёт is_admin() с ВШИТЫМ owner UUID как основной identity
--      (+ profiles.role='admin' + email owner как defense-in-depth).
--
--  Никакого service_role/секретов. RLS других таблиц не ослабляется — все
--  admin-only политики/RPC (admin_list_users, promo, wheel, products, orders,
--  system logs, password-reset lookup) опираются на эту же is_admin().
-- ============================================================

do $do$
declare
  v_owner uuid;
begin
  select id into v_owner
    from auth.users
   where lower(email) = 'olegperov2002@gmail.com'
   limit 1;

  if v_owner is null then
    raise exception
      'OWNER olegperov2002@gmail.com не найден в auth.users. Пусть владелец войдёт (Google) хотя бы один раз, затем повторите эту миграцию.';
  end if;

  -- (2) снять ошибочный admin у всех, кроме владельца
  update public.profiles
     set role = 'customer'
   where role = 'admin'
     and id <> v_owner;

  -- (3) гарантировать admin владельцу (профиль создаётся, если его ещё нет)
  insert into public.profiles (id, role)
    values (v_owner, 'admin')
  on conflict (id) do update set role = 'admin';

  -- (4) пересоздать is_admin() с ВШИТЫМ immutable owner UUID.
  --     Основной identity — auth.uid() == OWNER_UUID; role и email — доп. защита.
  execute format($tmpl$
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $body$
  select (auth.uid() = %L::uuid)
     and exists (
       select 1 from public.profiles p
       where p.id = auth.uid() and p.role = 'admin'
     )
     and lower(coalesce(auth.jwt() ->> 'email', '')) = 'olegperov2002@gmail.com';
$body$;
$tmpl$, v_owner);

  raise notice 'OK: owner=% (olegperov2002@gmail.com) назначен единственным админом; is_admin() пересоздан.', v_owner;
end
$do$;

-- ============================================================
--  ПРОВЕРКА (после Run):
--   -- ровно ОДНА строка, email = olegperov2002@gmail.com:
--   select u.email, p.role
--     from public.profiles p
--     join auth.users u on u.id = p.id
--    where p.role = 'admin';
--
--   -- определение функции содержит вшитый UUID + olegperov:
--   select pg_get_functiondef('public.is_admin()'::regprocedure);
--
--   -- под обычным аккаунтом (alekberov*) is_admin() → false;
--   -- под owner (olegperov) is_admin() → true.
-- ============================================================
