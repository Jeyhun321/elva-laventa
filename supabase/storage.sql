-- ============================================================
--  Хранилище фотографий товаров
--  Запустить в Supabase → SQL Editor → New query → Run
-- ============================================================

-- Публичная корзина для картинок: смотреть могут все, загружать — только вошедшие
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do update set public = true;

-- ---------- ПРАВА ДОСТУПА ----------

drop policy if exists "product images are public" on storage.objects;
create policy "product images are public"
  on storage.objects for select
  using (bucket_id = 'product-images');

drop policy if exists "authenticated can upload product images" on storage.objects;
create policy "authenticated can upload product images"
  on storage.objects for insert
  with check (
    bucket_id = 'product-images'
    and auth.role() = 'authenticated'
  );

drop policy if exists "authenticated can update product images" on storage.objects;
create policy "authenticated can update product images"
  on storage.objects for update
  using (bucket_id = 'product-images' and auth.role() = 'authenticated');

drop policy if exists "authenticated can delete product images" on storage.objects;
create policy "authenticated can delete product images"
  on storage.objects for delete
  using (bucket_id = 'product-images' and auth.role() = 'authenticated');

-- Проверка
select id, name, public from storage.buckets where id = 'product-images';
