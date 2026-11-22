do $$
begin
  if exists (
    select 1
    from public.products as product
    left join public.categories as category on category.name = product.category
    where category.name is null
  ) then
    raise exception 'Some products do not reference an existing category.';
  end if;

  if exists (
    select 1
    from public.categories
    group by lower(btrim(name))
    having count(*) > 1
  ) then
    raise exception 'Category names still contain case-insensitive duplicates.';
  end if;

  if not exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and tablename = 'categories'
      and indexname = 'categories_name_casefold_key'
  ) then
    raise exception 'Case-insensitive category uniqueness is not enforced.';
  end if;

  if exists (
    select 1
    from (values
      ('Clothes'),
      ('Pharmaceuticals'),
      ('Fast Food'),
      ('Houses'),
      ('Electronics')
    ) as required(name)
    where not exists (
      select 1
      from public.categories as category
      where category.name = required.name
    )
  ) then
    raise exception 'One or more standard categories are missing.';
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'products_category_fkey'
      and conrelid = 'public.products'::regclass
      and confupdtype = 'c'
      and confdeltype = 'r'
  ) then
    raise exception 'The category foreign key must cascade updates and restrict deletes.';
  end if;

  if not (
    select relrowsecurity
    from pg_class
    where oid = 'public.categories'::regclass
  ) then
    raise exception 'Row-level security is not enabled for categories.';
  end if;
end
$$;
