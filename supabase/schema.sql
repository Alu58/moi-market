create table if not exists public.admin_users (
  id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 120),
  category text not null check (char_length(btrim(category)) between 1 and 80),
  price text not null check (char_length(btrim(price)) between 1 and 80),
  description text not null check (char_length(btrim(description)) between 1 and 2000),
  image_url text check (image_url is null or char_length(image_url) <= 2048),
  seller_phone text check (seller_phone is null or char_length(seller_phone) <= 40),
  created_at timestamptz not null default now()
);

alter table public.products
  add column if not exists seller_phone text check (seller_phone is null or char_length(seller_phone) <= 40);

alter table public.admin_users enable row level security;
alter table public.products enable row level security;

revoke all on public.admin_users from anon, authenticated;
revoke all on public.products from anon, authenticated;
grant select on public.admin_users to authenticated;
grant select on public.products to anon, authenticated;
grant insert, update, delete on public.products to authenticated;

drop policy if exists "Admins can read their own authorization" on public.admin_users;
create policy "Admins can read their own authorization"
  on public.admin_users for select to authenticated
  using (id = (select auth.uid()));

drop policy if exists "Anyone can read products" on public.products;
create policy "Anyone can read products"
  on public.products for select to anon, authenticated
  using (true);

drop policy if exists "Admins can add products" on public.products;
create policy "Admins can add products"
  on public.products for insert to authenticated
  with check (
    exists (
      select 1
      from public.admin_users
      where admin_users.id = (select auth.uid())
    )
  );

drop policy if exists "Admins can update products" on public.products;
create policy "Admins can update products"
  on public.products for update to authenticated
  using (
    exists (
      select 1
      from public.admin_users
      where admin_users.id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.admin_users
      where admin_users.id = (select auth.uid())
    )
  );

drop policy if exists "Admins can delete products" on public.products;
create policy "Admins can delete products"
  on public.products for delete to authenticated
  using (
    exists (
      select 1
      from public.admin_users
      where admin_users.id = (select auth.uid())
    )
  );

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-images',
  'product-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
set name = excluded.name,
    public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Admins can upload product images" on storage.objects;
create policy "Admins can upload product images"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'product-images'
    and exists (
      select 1
      from public.admin_users
      where admin_users.id = (select auth.uid())
    )
  );

drop policy if exists "Admins can update product images" on storage.objects;
create policy "Admins can update product images"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'product-images'
    and exists (
      select 1
      from public.admin_users
      where admin_users.id = (select auth.uid())
    )
  )
  with check (
    bucket_id = 'product-images'
    and exists (
      select 1
      from public.admin_users
      where admin_users.id = (select auth.uid())
    )
  );

drop policy if exists "Admins can delete product images" on storage.objects;
create policy "Admins can delete product images"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'product-images'
    and exists (
      select 1
      from public.admin_users
      where admin_users.id = (select auth.uid())
    )
  );
