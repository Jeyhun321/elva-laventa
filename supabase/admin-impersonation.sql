-- ============================================================
--  Elva LaVenta — Owner impersonation ("Войти как пользователь")
--
--  Запустить ЦЕЛИКОМ: Supabase → SQL Editor → New query → вставить → Run.
--  ИДЕМПОТЕНТНО (create table if not exists / create or replace).
--
--  МОДЕЛЬ БЕЗОПАСНОСТИ:
--   - actor = реальный owner (его сессия/JWT неизменны; второй auth-клиент НЕ создаётся);
--   - доступ к данным ЛЮБОГО target — ТОЛЬКО через эти security-definer RPC, каждый
--     первым делом проверяет public.is_admin() (immutable owner UUID + role + email);
--   - плюс требуется АКТИВНЫЙ серверный grant с TTL (admin_impersonation_start);
--   - RLS обычных таблиц НЕ ослабляется — обычные пользователи остаются на auth.uid();
--   - service_role во фронте НЕ используется; секреты не возвращаются.
--
--  Обычный пользователь / anon, вызвавший любой admin_imp_* напрямую (DevTools/REST):
--   → is_admin()=false → AUTH_REQUIRED. Смена target UUID ему не помогает.
-- ============================================================

-- ---------- Grant-таблица активных сессий имперсонации (TTL) ----------
create table if not exists public.admin_impersonations (
  id          bigint generated always as identity primary key,
  owner_id    uuid not null references auth.users(id) on delete cascade,
  target_id   uuid not null references auth.users(id) on delete cascade,
  started_at  timestamptz not null default now(),
  expires_at  timestamptz not null,
  ended_at    timestamptz
);
create index if not exists admin_imp_active_idx
  on public.admin_impersonations (owner_id, target_id) where ended_at is null;

alter table public.admin_impersonations enable row level security;
-- Прямого клиентского доступа нет — только через RPC ниже. Читать может админ (аудит).
drop policy if exists "imp admin read" on public.admin_impersonations;
create policy "imp admin read" on public.admin_impersonations for select
  using (public.is_admin());

-- ---------- Есть ли активный (не истёкший) grant owner→target ----------
create or replace function public._imp_active(p_target uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.admin_impersonations a
     where a.owner_id = auth.uid()
       and a.target_id = p_target
       and a.ended_at is null
       and a.expires_at > now()
  );
$$;

-- Общий guard: только owner + активный grant. Иначе — исключение.
create or replace function public._imp_guard(p_target uuid)
returns void
language plpgsql stable security definer set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'AUTH_REQUIRED'; end if;
  if p_target is null then raise exception 'TARGET_REQUIRED'; end if;
  if not public._imp_active(p_target) then raise exception 'IMPERSONATION_NOT_ACTIVE'; end if;
end $$;

-- ---------- START: создать grant (TTL 45 мин) + аудит ----------
create or replace function public.admin_impersonation_start(p_target uuid)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare v_email text; v_name text; v_exp timestamptz;
begin
  if not public.is_admin() then raise exception 'AUTH_REQUIRED'; end if;
  if p_target is null then raise exception 'TARGET_REQUIRED'; end if;
  if p_target = auth.uid() then raise exception 'CANNOT_IMPERSONATE_SELF'; end if;

  select u.email,
         coalesce(nullif(btrim(p.full_name), ''),
                  u.raw_user_meta_data ->> 'full_name',
                  u.raw_user_meta_data ->> 'name',
                  split_part(u.email, '@', 1))
    into v_email, v_name
    from auth.users u
    left join public.profiles p on p.id = u.id
   where u.id = p_target;

  if v_email is null then raise exception 'TARGET_NOT_FOUND'; end if;

  -- завершить любые предыдущие активные grant'ы этого owner (один активный за раз)
  update public.admin_impersonations set ended_at = now()
   where owner_id = auth.uid() and ended_at is null;

  v_exp := now() + interval '45 minutes';
  insert into public.admin_impersonations (owner_id, target_id, expires_at)
    values (auth.uid(), p_target, v_exp);

  insert into public.system_logs (level, source, event, message, details, user_id)
    values ('warning', 'impersonation', 'USER_IMPERSONATION_STARTED',
            'Owner started impersonation',
            jsonb_build_object('owner_id', auth.uid(), 'target_id', p_target,
                               'target_email', v_email, 'expires_at', v_exp),
            auth.uid());

  return jsonb_build_object('target_id', p_target, 'email', v_email,
                            'full_name', v_name, 'expires_at', v_exp);
end $$;

-- ---------- END: завершить активные grant'ы + аудит ----------
create or replace function public.admin_impersonation_end()
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare v_target uuid;
begin
  if not public.is_admin() then raise exception 'AUTH_REQUIRED'; end if;
  select target_id into v_target from public.admin_impersonations
    where owner_id = auth.uid() and ended_at is null
    order by started_at desc limit 1;
  update public.admin_impersonations set ended_at = now()
    where owner_id = auth.uid() and ended_at is null;
  insert into public.system_logs (level, source, event, message, details, user_id)
    values ('info', 'impersonation', 'USER_IMPERSONATION_ENDED',
            'Owner ended impersonation',
            jsonb_build_object('owner_id', auth.uid(), 'target_id', v_target),
            auth.uid());
  return jsonb_build_object('ended', true);
end $$;

-- ---------- READ: профиль target (whitelist) ----------
create or replace function public.admin_imp_get_profile(p_target uuid)
returns jsonb
language plpgsql stable security definer set search_path = public
as $$
declare v jsonb;
begin
  perform public._imp_guard(p_target);
  select jsonb_build_object(
           'id', u.id, 'email', u.email,
           'full_name', coalesce(nullif(btrim(p.full_name), ''),
                                 u.raw_user_meta_data ->> 'full_name',
                                 u.raw_user_meta_data ->> 'name',
                                 split_part(u.email, '@', 1)),
           'phone', p.phone, 'birth_date', p.birth_date,
           'created_at', u.created_at)
    into v
    from auth.users u
    left join public.profiles p on p.id = u.id
   where u.id = p_target;
  return v;
end $$;

-- ---------- READ: корзина target ----------
create or replace function public.admin_imp_get_cart(p_target uuid)
returns table (product_id bigint, size text, quantity integer)
language plpgsql stable security definer set search_path = public
as $$
begin
  perform public._imp_guard(p_target);
  return query select c.product_id, c.size, c.quantity
                 from public.customer_cart_items c where c.user_id = p_target;
end $$;

-- ---------- WRITE: корзина target ----------
create or replace function public.admin_imp_cart_upsert(p_target uuid, p_product bigint, p_size text, p_qty integer)
returns void language plpgsql security definer set search_path = public
as $$
begin
  perform public._imp_guard(p_target);
  insert into public.customer_cart_items (user_id, product_id, size, quantity)
    values (p_target, p_product, coalesce(p_size, ''), greatest(1, least(20, coalesce(p_qty, 1))))
  on conflict (user_id, product_id, size) do update set quantity = excluded.quantity, updated_at = now();
end $$;

create or replace function public.admin_imp_cart_remove(p_target uuid, p_product bigint, p_size text)
returns void language plpgsql security definer set search_path = public
as $$
begin
  perform public._imp_guard(p_target);
  delete from public.customer_cart_items
   where user_id = p_target and product_id = p_product and size = coalesce(p_size, '');
end $$;

create or replace function public.admin_imp_cart_clear(p_target uuid)
returns void language plpgsql security definer set search_path = public
as $$
begin
  perform public._imp_guard(p_target);
  delete from public.customer_cart_items where user_id = p_target;
end $$;

-- ---------- READ: избранное target ----------
create or replace function public.admin_imp_get_favorites(p_target uuid)
returns table (product_id bigint)
language plpgsql stable security definer set search_path = public
as $$
begin
  perform public._imp_guard(p_target);
  return query select f.product_id from public.customer_favorites f where f.user_id = p_target;
end $$;

-- ---------- WRITE: переключить избранное target ----------
create or replace function public.admin_imp_fav_toggle(p_target uuid, p_product bigint)
returns boolean language plpgsql security definer set search_path = public
as $$
declare v_exists boolean;
begin
  perform public._imp_guard(p_target);
  select exists(select 1 from public.customer_favorites
                 where user_id = p_target and product_id = p_product) into v_exists;
  if v_exists then
    delete from public.customer_favorites where user_id = p_target and product_id = p_product;
    return false;
  else
    insert into public.customer_favorites (user_id, product_id) values (p_target, p_product)
      on conflict (user_id, product_id) do nothing;
    return true;
  end if;
end $$;

-- ---------- READ: wheel-награда/купон target (как get_wheel_status.active_reward) ----------
create or replace function public.admin_imp_get_wheel_status(p_target uuid)
returns jsonb
language plpgsql stable security definer set search_path = public
as $$
declare c public.wheel_config%rowtype; v_reward jsonb;
begin
  perform public._imp_guard(p_target);
  select * into c from public.wheel_config where id = 1;
  select jsonb_build_object('code', pc.code, 'percent', pc.discount_value, 'expires_at', pc.expires_at)
    into v_reward
    from public.promo_codes pc
   where pc.assigned_account_id = p_target
     and pc.source = 'wheel' and pc.active
     and (pc.expires_at is null or pc.expires_at > now())
     and not exists (select 1 from public.promo_redemptions r where r.promo_id = pc.id)
   order by pc.created_at desc limit 1;
  return jsonb_build_object(
    'enabled', coalesce(c.enabled, false),
    'signed_in', true,
    'in_window', false,
    'already_spun', false,
    'active_reward', v_reward
  );
end $$;

-- ---------- READ: заказы target (RPC доступен; storefront-страницы заказов пока нет) ----------
create or replace function public.admin_imp_get_orders(p_target uuid)
returns jsonb
language plpgsql stable security definer set search_path = public
as $$
declare v jsonb;
begin
  perform public._imp_guard(p_target);
  select coalesce(jsonb_agg(jsonb_build_object(
           'id', o.id, 'order_no', o.order_no, 'status', o.status,
           'created_at', o.created_at, 'total', o.total) order by o.created_at desc), '[]'::jsonb)
    into v from public.orders o where o.user_id = p_target;
  return v;
end $$;

-- ---------- Грант прав: только authenticated (функции сами гейтят is_admin + grant) ----------
do $$
declare fn text;
begin
  foreach fn in array array[
    'admin_impersonation_start(uuid)','admin_impersonation_end()',
    'admin_imp_get_profile(uuid)','admin_imp_get_cart(uuid)',
    'admin_imp_cart_upsert(uuid,bigint,text,integer)','admin_imp_cart_remove(uuid,bigint,text)',
    'admin_imp_cart_clear(uuid)','admin_imp_get_favorites(uuid)','admin_imp_fav_toggle(uuid,bigint)',
    'admin_imp_get_wheel_status(uuid)','admin_imp_get_orders(uuid)'
  ] loop
    execute format('revoke all on function public.%s from anon, public;', fn);
    execute format('grant execute on function public.%s to authenticated;', fn);
  end loop;
end $$;
-- внутренние helper'ы закрываем от прямого вызова
revoke all on function public._imp_active(uuid) from anon, public;
revoke all on function public._imp_guard(uuid) from anon, public;

-- ============================================================
--  ПРОВЕРКА:
--   -- под обычным юзером/anon: select public.admin_imp_get_cart('<uuid>'); → AUTH_REQUIRED
--   -- под owner без start: → IMPERSONATION_NOT_ACTIVE
--   -- под owner: select public.admin_impersonation_start('<target uuid>'); затем READ работает
--   -- аудит: select * from public.system_logs where source='impersonation' order by created_at desc;
-- ============================================================
