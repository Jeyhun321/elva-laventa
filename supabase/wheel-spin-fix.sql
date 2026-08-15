-- ============================================================
--  Elva LaVenta — Phase 2 FIX: Wheel spin + 7 секторов (active/locked)
--
--  Запустить ЦЕЛИКОМ: Supabase → SQL Editor → New query → вставить → Run.
--  ИДЕМПОТЕНТНО и безопасно (create or replace + merge существующих весов).
--
--  ЧТО ЧИНИТ:
--  1) BUG: FIRLAT → «Xəta baş verdi». Root cause — `gen_random_bytes` (pgcrypto)
--     не резолвится при `search_path = public` (в Supabase pgcrypto в схеме
--     `extensions`). Фактическая ошибка: 42883 "function gen_random_bytes(integer)
--     does not exist". Убираем зависимость от pgcrypto — используем встроенный
--     `random()` (pg_catalog) для weighted-выбора и генерации кода.
--  2) 7 секторов: wheel_config.rewards хранит ВСЕ сектора 5/10/15/20/30/40/50.
--     ACTIVE = weight>0 (реально выпадают), LOCKED = weight=0 (только показ).
--     spin_wheel и так выбирает только weight>0 → 20/30/40/50 НИКОГДА не выпадут.
--  3) get_wheel_public_config отдаёт `sectors:[{percent,active}]` (без весов).
-- ============================================================

-- ---------- (1) Генерация кода без pgcrypto ----------
create or replace function public.generate_promo_code(p_prefix text default 'VIP')
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_code text;
  v_suffix text;
  v_try int := 0;
  i int;
begin
  loop
    v_suffix := '';
    for i in 1..6 loop
      -- random() ∈ [0,1); индекс 1..length (substr 1-indexed)
      v_suffix := v_suffix || substr(v_alphabet, 1 + floor(random() * length(v_alphabet))::int, 1);
    end loop;
    v_code := upper(coalesce(nullif(btrim(p_prefix), ''), 'VIP')) || '-' || v_suffix;
    exit when not exists (select 1 from public.promo_codes where upper(code) = upper(v_code));
    v_try := v_try + 1;
    if v_try > 20 then
      raise exception 'CODE_GEN_FAILED';
    end if;
  end loop;
  return v_code;
end $$;

revoke all on function public.generate_promo_code(text) from public;
grant execute on function public.generate_promo_code(text) to authenticated;

-- ---------- (2) SPIN без pgcrypto (weighted через random()) ----------
create or replace function public.spin_wheel()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  c public.wheel_config%rowtype;
  v_window text;
  v_key text;
  v_total_weight numeric := 0;
  v_pick numeric;
  v_acc numeric := 0;
  r jsonb;
  v_percent numeric := null;
  v_code text;
  v_promo_id bigint;
  v_expiry timestamptz;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  select * into c from public.wheel_config where id = 1;
  if not found or c.enabled is not true then
    raise exception 'WHEEL_DISABLED';
  end if;

  v_window := public._wheel_current_window(c);
  if v_window is null then
    raise exception 'WHEEL_CLOSED';
  end if;
  v_key := public._wheel_window_key(c, v_window);

  -- Сумма весов ТОЛЬКО активных наград (weight>0). Locked (weight=0) исключены.
  for r in select value from jsonb_array_elements(c.rewards)
           where coalesce((value->>'weight')::numeric, 0) > 0 loop
    v_total_weight := v_total_weight + (r->>'weight')::numeric;
  end loop;
  if v_total_weight <= 0 then
    raise exception 'WHEEL_NO_REWARDS';
  end if;

  -- Взвешенный выбор на сервере (built-in random(); frontend НЕ участвует).
  v_pick := random() * v_total_weight;
  for r in select value from jsonb_array_elements(c.rewards)
           where coalesce((value->>'weight')::numeric, 0) > 0
           order by (value->>'percent')::numeric loop
    v_acc := v_acc + (r->>'weight')::numeric;
    if v_pick <= v_acc then
      v_percent := (r->>'percent')::numeric;
      exit;
    end if;
  end loop;
  if v_percent is null then
    select (value->>'percent')::numeric into v_percent
      from jsonb_array_elements(c.rewards)
      where coalesce((value->>'weight')::numeric, 0) > 0
      order by (value->>'percent')::numeric desc limit 1;
  end if;

  v_expiry := now() + make_interval(hours => c.reward_expiry_hours);

  v_code := public.generate_promo_code('WHEEL');
  insert into public.promo_codes (
    code, type, discount_type, discount_value, active,
    expires_at, max_total_uses, max_uses_per_account, assigned_account_id, source, created_by
  ) values (
    v_code, 'individual', 'percent', v_percent, true,
    v_expiry, 1, 1, auth.uid(), 'wheel', auth.uid()
  ) returning id into v_promo_id;

  begin
    insert into public.wheel_spins (account_id, window_key, reward_percent, promo_id)
      values (auth.uid(), v_key, v_percent, v_promo_id);
  exception when unique_violation then
    delete from public.promo_codes where id = v_promo_id;
    raise exception 'WHEEL_ALREADY_SPUN';
  end;

  return jsonb_build_object('percent', v_percent, 'code', v_code, 'expires_at', v_expiry);
end $$;

revoke all on function public.spin_wheel() from anon;
grant execute on function public.spin_wheel() to authenticated;

-- ---------- (3) Публичный конфиг: sectors (active/locked), без весов ----------
create or replace function public.get_wheel_public_config()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare c public.wheel_config%rowtype;
begin
  select * into c from public.wheel_config where id = 1;
  if not found then
    return jsonb_build_object('enabled', false);
  end if;
  return jsonb_build_object(
    'enabled', c.enabled,
    'timezone', c.timezone,
    'windows', to_jsonb(c.windows),
    'tolerance_minutes', c.tolerance_minutes,
    'reward_expiry_hours', c.reward_expiry_hours,
    -- ВСЕ сектора для отрисовки колеса: {percent, active}. Веса НЕ отдаём.
    'sectors', (
      select coalesce(jsonb_agg(
        jsonb_build_object('percent', (r->>'percent')::numeric,
                           'active', coalesce((r->>'weight')::numeric, 0) > 0)
        order by (r->>'percent')::numeric), '[]'::jsonb)
      from jsonb_array_elements(c.rewards) r
    ),
    -- Совместимость: только реально достижимые проценты (weight>0)
    'rewards', (
      select coalesce(jsonb_agg((r->>'percent')::numeric order by (r->>'percent')::numeric), '[]'::jsonb)
      from jsonb_array_elements(c.rewards) r
      where coalesce((r->>'weight')::numeric, 0) > 0
    )
  );
end $$;

grant execute on function public.get_wheel_public_config() to anon, authenticated;

-- ---------- (4) Seed: гарантируем 7 секторов, сохраняя текущие веса ----------
--  ACTIVE по умолчанию: 5→80, 10→17, 15→3 (если ещё не заданы).
--  LOCKED: 20/30/40/50 → weight 0 (добавляются, если отсутствуют).
--  Существующие веса НЕ перезаписываются (идемпотентно).
do $$
declare
  cur jsonb;
  r jsonb;
  m jsonb := '{}'::jsonb;
  defaults jsonb := '{"5":80,"10":17,"15":3}'::jsonb;
  full_set numeric[] := array[5,10,15,20,30,40,50];
  out jsonb := '[]'::jsonb;
  pct numeric;
  w numeric;
begin
  select rewards into cur from public.wheel_config where id = 1;
  for r in select value from jsonb_array_elements(coalesce(cur, '[]'::jsonb)) loop
    m := m || jsonb_build_object((r->>'percent'), coalesce((r->>'weight')::numeric, 0));
  end loop;
  foreach pct in array full_set loop
    if m ? pct::text then
      w := (m->>pct::text)::numeric;
    elsif defaults ? pct::text then
      w := (defaults->>pct::text)::numeric;
    else
      w := 0;
    end if;
    out := out || jsonb_build_object('percent', pct, 'weight', w);
  end loop;
  update public.wheel_config set rewards = out where id = 1;
end $$;

-- ---------- ПРОВЕРКА ----------
-- select public.generate_promo_code('WHEEL');            -- должен вернуть код WHEEL-XXXXXX
-- select public.get_wheel_public_config();               -- sectors: 7 шт, active у 5/10/15
-- В активном окне под пользователем: select public.spin_wheel();
