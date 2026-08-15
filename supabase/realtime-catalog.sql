-- ============================================================
--  Admin → Storefront canlı sinxronizasiya (Supabase Realtime)
--  Phase 1 / Task 3.
--
--  Müştəri saytı (CatalogContext) `products` və `categories` cədvəllərinə
--  Realtime abunə olur: admin dəyişiklik edəndə açıq müştəri səhifəsi FULL
--  RELOAD OLMADAN yenilənir. Bunun işləməsi üçün həmin cədvəllər Supabase-in
--  `supabase_realtime` publication-una daxil olmalıdır.
--
--  Bu skript İDEMPOTENTDİR — təkrar işə salmaq təhlükəsizdir.
--  Supabase Dashboard → SQL Editor-də bir dəfə işə salın
--  (və ya: Dashboard → Database → Replication → `supabase_realtime` →
--   `products` və `categories` cədvəllərini aktiv edin).
-- ============================================================

-- products cədvəli publication-da deyilsə → əlavə et
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'products'
  ) then
    execute 'alter publication supabase_realtime add table public.products';
  end if;
end $$;

-- categories cədvəli publication-da deyilsə → əlavə et
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'categories'
  ) then
    execute 'alter publication supabase_realtime add table public.categories';
  end if;
end $$;

-- Yoxlama: hansı cədvəllər Realtime-dadır
-- select schemaname, tablename from pg_publication_tables where pubname = 'supabase_realtime';

-- QEYD: RLS. Müştəri anonim açarla oxuyur; `products`/`categories` üçün public
-- SELECT siyasəti onsuz da var (kataloq ictimaidir). Realtime dəyişiklik
-- payloadı da həmin SELECT siyasətinə tabedir — əlavə icazə lazım deyil.
