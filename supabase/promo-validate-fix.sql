-- ============================================================
--  Elva LaVenta — Phase 2 FIX #2: _validate_promo ambiguous column
--
--  Запустить ЦЕЛИКОМ: Supabase → SQL Editor → New query → вставить → Run.
--  ИДЕМПОТЕНТНО (create or replace).
--
--  BUG (найден LIVE-тестом на валидном коде):
--    validate_promo / place_order(с промо) → 42702
--    "column reference \"promo_id\" is ambiguous".
--  Root cause: в _validate_promo OUT-колонка `promo_id` (RETURNS TABLE)
--    конфликтует с колонкой public.promo_redemptions.promo_id в запросах
--    подсчёта использований. Раньше не проявлялось, т.к. тестировались только
--    несуществующие коды (выход до этих запросов).
--  Fix: алиасируем promo_redemptions (pr.) — колонка становится однозначной.
--    Логика/контракт не меняются.
-- ============================================================

create or replace function public._validate_promo(
  p_code      text,
  p_account   uuid,
  p_subtotal  numeric,
  p_lock      boolean default false
)
returns table (promo_id bigint, discount_type text, discount_value numeric, discount_amount numeric)
language plpgsql
security definer
set search_path = public
as $$
declare
  v public.promo_codes%rowtype;
  v_used_account int;
  v_used_total int;
  v_amount numeric;
begin
  if p_account is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  if p_lock then
    select * into v from public.promo_codes
      where upper(code) = upper(btrim(p_code)) for update;
  else
    select * into v from public.promo_codes
      where upper(code) = upper(btrim(p_code));
  end if;

  if not found then
    raise exception 'PROMO_NOT_FOUND';
  end if;
  if v.active is not true then
    raise exception 'PROMO_INACTIVE';
  end if;
  if v.starts_at is not null and now() < v.starts_at then
    raise exception 'PROMO_NOT_STARTED';
  end if;
  if v.expires_at is not null and now() > v.expires_at then
    raise exception 'PROMO_EXPIRED';
  end if;
  if v.type = 'individual' and v.assigned_account_id is distinct from p_account then
    raise exception 'PROMO_ACCOUNT_MISMATCH';
  end if;
  if v.minimum_order_amount is not null and coalesce(p_subtotal, 0) < v.minimum_order_amount then
    raise exception 'PROMO_MIN_ORDER';
  end if;

  -- Алиас pr. устраняет неоднозначность promo_id (OUT-колонка vs колонка таблицы).
  if v.max_uses_per_account is not null then
    select count(*) into v_used_account from public.promo_redemptions pr
      where pr.promo_id = v.id and pr.account_id = p_account;
    if v_used_account >= v.max_uses_per_account then
      raise exception 'PROMO_ALREADY_USED';
    end if;
  end if;

  if v.max_total_uses is not null then
    select count(*) into v_used_total from public.promo_redemptions pr
      where pr.promo_id = v.id;
    if v_used_total >= v.max_total_uses then
      raise exception 'PROMO_LIMIT_REACHED';
    end if;
  end if;

  if v.discount_type = 'percent' then
    v_amount := round(coalesce(p_subtotal, 0) * v.discount_value / 100.0, 2);
  else
    v_amount := least(v.discount_value, coalesce(p_subtotal, 0));
  end if;
  v_amount := greatest(0, v_amount);

  promo_id := v.id;
  discount_type := v.discount_type;
  discount_value := v.discount_value;
  discount_amount := v_amount;
  return next;
end $$;

revoke all on function public._validate_promo(text, uuid, numeric, boolean) from public;

-- ПРОВЕРКА (в активном окне у пользователя с наградой колеса):
--   select * from public.validate_promo('<WHEEL-код>', 49);  -- вернёт discount, без 42702
