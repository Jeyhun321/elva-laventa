-- ============================================================
--  Elva LaVenta — Admin Users module (защищённый список пользователей)
--
--  Запустить ЦЕЛИКОМ: Supabase → SQL Editor → New query → вставить → Run.
--  ИДЕМПОТЕНТНО (create or replace).
--
--  ЧТО ДАЁТ:
--  RPC `admin_list_users()` — единственный безопасный способ получить список
--  зарегистрированных пользователей для Admin UI. Витрина/anon НЕ имеют прямого
--  доступа к `auth.users`; чтение идёт ТОЛЬКО через эту security-definer функцию,
--  которая:
--    1) проверяет JWT текущего пользователя неявно (auth.uid()/auth.jwt());
--    2) проверяет public.is_admin() — единственный source of truth админ-прав;
--    3) только после этого читает auth.users с повышенными правами (definer);
--    4) возвращает ТОЛЬКО whitelist безопасных полей.
--
--  НИКОГДА не возвращает: password / encrypted_password / access|refresh token /
--  provider tokens / raw OAuth payload / service_role. Только публично-безопасные
--  атрибуты профиля + агрегаты (заказы, использования промо).
--
--  Безопасность: service_role во фронте НЕ используется; RLS других таблиц не
--  ослабляется. Сброс пароля выполняется стандартным Supabase recovery-flow
--  (пользователь сам ставит новый пароль по ссылке из письма) — админ пароль
--  НЕ видит и НЕ задаёт. Перечисление пользователей (единственная чувствительная
--  часть) закрыто этим is_admin-гейтом.
-- ============================================================

create or replace function public.admin_list_users()
returns table (
  id              uuid,
  email           text,
  full_name       text,
  role            text,
  email_verified  boolean,
  created_at      timestamptz,
  last_sign_in_at timestamptz,
  orders_count    bigint,
  promo_count     bigint
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  -- Единственный source of truth админ-прав (server-trusted). Клиентские
  -- проверки (email/route) — только UX; здесь сервер отклоняет любого не-админа,
  -- даже если он вызовет RPC напрямую из DevTools/REST.
  if not public.is_admin() then
    raise exception 'AUTH_REQUIRED';
  end if;

  return query
  select
    u.id,
    u.email::text,
    coalesce(
      nullif(btrim(p.full_name), ''),
      u.raw_user_meta_data ->> 'full_name',
      u.raw_user_meta_data ->> 'name',
      split_part(u.email, '@', 1)
    )::text                                             as full_name,
    coalesce(p.role, 'customer')::text                  as role,
    (u.email_confirmed_at is not null)                  as email_verified,
    u.created_at,
    u.last_sign_in_at,
    (select count(*) from public.orders o
       where o.user_id = u.id)                          as orders_count,
    (select count(*) from public.promo_redemptions r
       where r.account_id = u.id)                       as promo_count
  from auth.users u
  left join public.profiles p on p.id = u.id
  order by u.created_at desc;
end $$;

-- Прямого доступа для anon НЕТ; authenticated может вызвать, но функция сама
-- отклонит не-админа (is_admin). Внутренние права definer покрывают чтение auth.users.
revoke all on function public.admin_list_users() from anon, public;
grant execute on function public.admin_list_users() to authenticated;

-- ============================================================
--  ПРОВЕРКА:
--   -- под админом (в Admin-сессии): select * from public.admin_list_users();
--   -- под обычным пользователем/anon: тот же вызов → ошибка AUTH_REQUIRED.
-- ============================================================
