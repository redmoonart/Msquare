-- ============================================================
-- M SQUARE — الإحصائيات (التتبع)
-- شغّل هذا الملف مرة واحدة في Supabase SQL Editor بعد setup.sql.
-- آمن لإعادة التشغيل، ولا يحذف أي بيانات.
-- ============================================================

-- كل زيارة / مشاهدة منتج / إضافة للسلة / بحث ... تُسجَّل كحدث
create table if not exists public.ms_events (
  id bigint generated always as identity primary key,
  type text not null check (type in ('page_view','product_view','add_to_cart','checkout','order','search','filter')),
  visitor_id text not null check (char_length(visitor_id) between 8 and 40),
  product_id bigint,
  path text check (char_length(path) <= 120),
  value text check (char_length(value) <= 100),
  referrer text check (char_length(referrer) <= 100),
  device text check (device in ('mobile','tablet','desktop')),
  lang text check (lang in ('ar','fr')),
  created_at timestamptz not null default now()
);

create index if not exists ms_events_created_idx on public.ms_events (created_at desc);
create index if not exists ms_events_type_created_idx on public.ms_events (type, created_at desc);

-- الوقت يحدده الخادم دائماً
create or replace function public.ms_events_stamp() returns trigger
language plpgsql as $$
begin
  new.created_at := now();
  return new;
end $$;

drop trigger if exists ms_events_stamp on public.ms_events;
create trigger ms_events_stamp before insert on public.ms_events
  for each row execute function public.ms_events_stamp();

alter table public.ms_events enable row level security;

drop policy if exists "ms anyone can track" on public.ms_events;
create policy "ms anyone can track" on public.ms_events
  for insert to anon, authenticated with check (true);

drop policy if exists "ms admin read events" on public.ms_events;
create policy "ms admin read events" on public.ms_events
  for select to authenticated using (public.ms_is_admin());

drop policy if exists "ms admin delete events" on public.ms_events;
create policy "ms admin delete events" on public.ms_events
  for delete to authenticated using (public.ms_is_admin());

-- ------------------------------------------------------------
-- ms_stats(days): كل أرقام صفحة الإحصائيات في طلب واحد (للمدير فقط)
-- days = 1 اليوم، 7، 30، 90 ...
-- ------------------------------------------------------------
create or replace function public.ms_stats(days integer default 30) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  tz constant text := 'Africa/Algiers';
  since timestamptz;
  result jsonb;
begin
  if not public.ms_is_admin() then
    raise exception 'not allowed';
  end if;

  days := greatest(1, least(coalesce(days, 30), 365));
  since := (date_trunc('day', now() at time zone tz) - make_interval(days => days - 1)) at time zone tz;

  with
  ev as (select * from ms_events where created_at >= since),
  ord as (select * from ms_orders where created_at >= since),
  good_ord as (select * from ord where status not in ('cancelled','refused')),
  sold as (
    select (i ->> 'id')::bigint as product_id,
           sum((i ->> 'qty')::int) as qty,
           sum((i ->> 'lineTotal')::int) as revenue
    from good_ord, jsonb_array_elements(items) i
    group by 1
  ),
  views as (
    select product_id, count(*) as views, count(distinct visitor_id) as viewers
    from ev where type = 'product_view' and product_id is not null group by 1
  ),
  carts as (
    select product_id, count(*) as adds
    from ev where type = 'add_to_cart' and product_id is not null group by 1
  ),
  steps as (
    select type, count(distinct visitor_id) as n from ev group by 1
  )
  select jsonb_build_object(
    'since', since,
    'totals', jsonb_build_object(
      'visitors',      (select count(distinct visitor_id) from ev where type = 'page_view'),
      'page_views',    (select count(*) from ev where type = 'page_view'),
      'product_views', (select count(*) from ev where type = 'product_view'),
      'add_to_cart',   (select count(*) from ev where type = 'add_to_cart'),
      'orders',        (select count(*) from ord),
      'good_orders',   (select count(*) from good_ord),
      'revenue',       (select coalesce(sum(total), 0) from good_ord),
      'items_sold',    (select coalesce(sum(qty), 0) from sold),
      'abandoned_carts', (
        select count(distinct visitor_id) from ev e
        where type = 'add_to_cart'
          and not exists (select 1 from ev o where o.type = 'order' and o.visitor_id = e.visitor_id))
    ),
    'funnel', jsonb_build_object(
      'visitors',     (select coalesce(max(n), 0) from steps where type = 'page_view'),
      'product_view', (select coalesce(max(n), 0) from steps where type = 'product_view'),
      'add_to_cart',  (select coalesce(max(n), 0) from steps where type = 'add_to_cart'),
      'checkout',     (select coalesce(max(n), 0) from steps where type = 'checkout'),
      'order',        (select coalesce(max(n), 0) from steps where type = 'order')
    ),
    'daily', (
      select coalesce(jsonb_agg(jsonb_build_object('day', d.day::date, 'visitors', coalesce(v.n, 0), 'orders', coalesce(o.n, 0)) order by d.day), '[]')
      from generate_series((since at time zone tz)::date, (now() at time zone tz)::date, interval '1 day') as d(day)
      left join (select (created_at at time zone tz)::date as day, count(distinct visitor_id) as n
                 from ev where type = 'page_view' group by 1) v on v.day = d.day::date
      left join (select (created_at at time zone tz)::date as day, count(*) as n
                 from ord group by 1) o on o.day = d.day::date
    ),
    'hours', (
      select coalesce(jsonb_agg(jsonb_build_object('hour', h, 'n', coalesce(n, 0)) order by h), '[]')
      from generate_series(0, 23) h
      left join (select extract(hour from created_at at time zone tz)::int as hr, count(*) as n
                 from ev where type = 'page_view' group by 1) x on x.hr = h
    ),
    'top_viewed', (
      select coalesce(jsonb_agg(r order by r.views desc), '[]') from (
        select p.id, p.name, p.brand, p.style, p.price, p.stock, p.colors,
               coalesce(p.images[1], p.image) as image,
               v.views, v.viewers, coalesce(c.adds, 0) as adds, coalesce(s.qty, 0) as sold
        from views v join ms_products p on p.id = v.product_id
        left join carts c on c.product_id = v.product_id
        left join sold s on s.product_id = v.product_id
        order by v.views desc limit 15) r
    ),
    'best_sellers', (
      select coalesce(jsonb_agg(r order by r.qty desc), '[]') from (
        select p.id, p.name, p.brand, p.style, p.colors, coalesce(p.images[1], p.image) as image,
               s.qty, s.revenue
        from sold s join ms_products p on p.id = s.product_id
        order by s.qty desc limit 10) r
    ),
    'never_viewed', (
      select coalesce(jsonb_agg(jsonb_build_object('id', p.id, 'name', p.name) order by p.id), '[]')
      from ms_products p
      where p.stock and not exists (select 1 from views v where v.product_id = p.id)
    ),
    'searches', (
      select coalesce(jsonb_agg(r order by r.n desc), '[]') from (
        select lower(value) as term, count(*) as n from ev
        where type = 'search' and value is not null group by 1 order by 2 desc limit 15) r
    ),
    'filters', (
      select coalesce(jsonb_agg(r order by r.n desc), '[]') from (
        select value, count(*) as n from ev
        where type = 'filter' and value is not null group by 1 order by 2 desc limit 20) r
    ),
    'devices', (
      select coalesce(jsonb_object_agg(coalesce(device, 'desktop'), n), '{}') from (
        select device, count(distinct visitor_id) as n from ev where type = 'page_view' group by 1) r
    ),
    'referrers', (
      select coalesce(jsonb_agg(r order by r.n desc), '[]') from (
        select coalesce(referrer, '') as source, count(distinct visitor_id) as n from ev
        where type = 'page_view' group by 1 order by 2 desc limit 10) r
    ),
    'pages', (
      select coalesce(jsonb_agg(r order by r.n desc), '[]') from (
        select coalesce(path, '/') as path, count(*) as n from ev
        where type = 'page_view' group by 1 order by 2 desc limit 10) r
    ),
    'wilayas', (
      select coalesce(jsonb_agg(r order by r.n desc), '[]') from (
        select coalesce(wilaya, '—') as wilaya, count(*) as n, sum(total) as revenue from good_ord
        group by 1 order by 2 desc limit 10) r
    ),
    'statuses', (
      select coalesce(jsonb_object_agg(status, n), '{}') from (
        select status, count(*) as n from ord group by 1) r
    )
  ) into result;

  return result;
end $$;

revoke all on function public.ms_stats(integer) from public, anon;
grant execute on function public.ms_stats(integer) to authenticated;

-- حذف الأحداث الأقدم من سنة (اختياري — شغّله يدوياً عند الحاجة):
-- delete from public.ms_events where created_at < now() - interval '1 year';
