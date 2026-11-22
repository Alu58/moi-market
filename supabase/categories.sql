begin;

create table if not exists public.categories (
  name text primary key check (char_length(btrim(name)) between 1 and 80)
);

insert into public.categories (name)
values
  ('Clothes'),
  ('Pharmaceuticals'),
  ('Fast Food'),
  ('Houses'),
  ('Electronics')
on conflict (name) do nothing;

update public.products as product
set category = seeded.name
from (
  values
    ('Clothes'),
    ('Pharmaceuticals'),
    ('Fast Food'),
    ('Houses'),
    ('Electronics')
) as seeded(name)
where lower(btrim(product.category)) = lower(seeded.name)
  and product.category <> seeded.name;

insert into public.categories (name)
select distinct on (lower(btrim(product.category))) btrim(product.category)
from public.products as product
where not exists (
  select 1
  from (values
    ('Clothes'),
    ('Pharmaceuticals'),
    ('Fast Food'),
    ('Houses'),
    ('Electronics')
  ) as seeded(name)
  where lower(btrim(product.category)) = lower(seeded.name)
)
order by lower(btrim(product.category)), btrim(product.category) collate "C"
on conflict (name) do nothing;

create temporary table category_alias_map on commit drop as
with seeded(name) as (
  values
    ('Clothes'),
    ('Pharmaceuticals'),
    ('Fast Food'),
    ('Houses'),
    ('Electronics')
)
select lower(btrim(category.name)) as normalized_name,
       coalesce(min(seeded.name), min(category.name collate "C")) as canonical_name
from public.categories as category
left join seeded on lower(btrim(category.name)) = lower(seeded.name)
group by lower(btrim(category.name));

update public.products as product
set category = aliases.canonical_name
from category_alias_map as aliases
where lower(btrim(product.category)) = aliases.normalized_name
  and product.category <> aliases.canonical_name;

delete from public.categories as category
using category_alias_map as aliases
where lower(btrim(category.name)) = aliases.normalized_name
  and category.name <> aliases.canonical_name;

drop table category_alias_map;

create unique index if not exists categories_name_casefold_key
  on public.categories (lower(btrim(name)));

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'products_category_fkey'
      and conrelid = 'public.products'::regclass
  ) then
    alter table public.products
      add constraint products_category_fkey
      foreign key (category)
      references public.categories (name)
      on update cascade
      on delete restrict;
  end if;
end
$$;

alter table public.categories enable row level security;

revoke all on public.categories from anon, authenticated;
grant select on public.categories to anon, authenticated;
grant insert, update, delete on public.categories to authenticated;

drop policy if exists "Anyone can read categories" on public.categories;
create policy "Anyone can read categories"
  on public.categories for select to anon, authenticated
  using (true);

drop policy if exists "Admins can add categories" on public.categories;
create policy "Admins can add categories"
  on public.categories for insert to authenticated
  with check (
    exists (
      select 1
      from public.admin_users
      where admin_users.id = (select auth.uid())
    )
  );

drop policy if exists "Admins can update categories" on public.categories;
create policy "Admins can update categories"
  on public.categories for update to authenticated
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

drop policy if exists "Admins can delete categories" on public.categories;
create policy "Admins can delete categories"
  on public.categories for delete to authenticated
  using (
    exists (
      select 1
      from public.admin_users
      where admin_users.id = (select auth.uid())
    )
  );

commit;
