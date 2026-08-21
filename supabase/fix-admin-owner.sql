-- ============================================================
--  Elva LaVenta — ADMIN OWNER HARDENING: единственный owner админки
--
--  Запустить ЦЕЛИКОМ: Supabase → SQL Editor → New query → вставить → Run.
--  ИДЕМПОТЕНТНО и безопасно (пользователей НЕ удаляет; только роли + is_admin()).
--
--  ЕДИНСТВЕННЫЙ ВЛАДЕЛЕЦ: alekberov.ceyhun2002@gmail.com
--
--  ЧТО ДЕЛАЕТ (SERVER-SIDE, единственный source of truth админ-прав):
--   1) находит immutable UUID владельца alekberov.ceyhun2002@gmail.com в auth.users;
--   2) снимает role='admin' у ВСЕХ, кроме владельца;
--   3) гарантирует role='admin' владельцу (создаёт профиль, если его нет);
--   4) пересоздаёт is_admin() с ВШИТЫМ owner UUID как ОСНОВНОЙ identity
--      (auth.uid() == OWNER_UUID) + profiles.role='admin' + email владельца
--      как defense-in-depth (тройная проверка).
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
   where lower(email) = 'alekberov.ceyhun2002@gmail.com'
   limit 1;

  if v_owner is null then
    raise exception
      'OWNER alekberov.ceyhun2002@gmail.com не найден в auth.users. Пусть владелец войдёт (Google) хотя бы один раз, затем повторите эту миграцию.';
  end if;

  -- (2) снять admin у всех, кроме владельца
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
     and lower(coalesce(auth.jwt() ->> 'email', '')) = 'alekberov.ceyhun2002@gmail.com';
$body$;
$tmpl$, v_owner);

  raise notice 'OK: owner=% (alekberov.ceyhun2002@gmail.com) назначен единственным админом; is_admin() пересоздан.', v_owner;
end
$do$;

-- ============================================================
--  ПРОВЕРКА (после Run):
--   -- ровно ОДНА строка, email = alekberov.ceyhun2002@gmail.com:
--   select u.email, p.role
--     from public.profiles p
--     join auth.users u on u.id = p.id
--    where p.role = 'admin';
--
--   -- определение функции содержит вшитый UUID + alekberov:
--   select pg_get_functiondef('public.is_admin()'::regprocedure);
--
--   -- под owner (alekberov) is_admin() → true;
--   -- под любым другим аккаунтом is_admin() → false.
-- ============================================================
