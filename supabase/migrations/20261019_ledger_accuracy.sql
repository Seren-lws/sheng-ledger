-- 声声记账本：修账 + 转账升级
-- 在 Supabase 网页 → SQL Editor 里整段粘贴运行一次即可（重复运行也安全）

begin;

set local search_path = sheng_ledger, public;

-- ─────────────────────────────────────────────
-- 1. 清理重复的「固定支出」分类（之前每次打开 app 都会多建一个）
--    保留被用得最多的那个，其余的账都挪过去，再删掉多余的
-- ─────────────────────────────────────────────
do $$
declare keep_id uuid;
begin
  select c.id into keep_id
  from sheng_ledger.categories c
  left join sheng_ledger.transactions t on t.category_id = c.id
  where c.name = '固定支出' and c.type = 'expense'
  group by c.id
  order by count(t.id) desc, c.id
  limit 1;

  if keep_id is not null then
    update sheng_ledger.transactions
      set category_id = keep_id
      where category_id in (
        select id from sheng_ledger.categories
        where name = '固定支出' and type = 'expense' and id <> keep_id
      );
    delete from sheng_ledger.categories
      where name = '固定支出' and type = 'expense' and id <> keep_id;
  end if;
end $$;

-- 同类型下分类不许重名，以后不会再重复
create unique index if not exists categories_type_name_key
  on sheng_ledger.categories (type, name);

-- ─────────────────────────────────────────────
-- 2. 币种跟着账户走：修掉已经记错币种的账
-- ─────────────────────────────────────────────
update sheng_ledger.transactions t
  set currency = a.currency
  from sheng_ledger.accounts a
  where t.account_id = a.id and t.currency <> a.currency;

-- ─────────────────────────────────────────────
-- 3. 每笔账记住当时的汇率（1 CNY = ? JPY）
--    旧账没留下当时的汇率，统一按现在的汇率定格
-- ─────────────────────────────────────────────
alter table sheng_ledger.transactions add column if not exists rate numeric;

update sheng_ledger.transactions
  set rate = (select cny_to_jpy from sheng_ledger.exchange_rates order by updated_at desc limit 1)
  where rate is null;

create or replace function sheng_ledger.current_rate() returns numeric
language sql stable as $$
  select coalesce(
    (select cny_to_jpy::numeric from sheng_ledger.exchange_rates order by updated_at desc limit 1),
    20::numeric
  )
$$;

create or replace function sheng_ledger.fill_tx_rate() returns trigger
language plpgsql as $$
begin
  if new.rate is null then new.rate := sheng_ledger.current_rate(); end if;
  return new;
end $$;

drop trigger if exists trg_fill_tx_rate on sheng_ledger.transactions;
create trigger trg_fill_tx_rate before insert on sheng_ledger.transactions
  for each row execute function sheng_ledger.fill_tx_rate();

-- ─────────────────────────────────────────────
-- 4. 固定支出：每笔自动记账和它的固定支出项绑定，按月份只记一次
-- ─────────────────────────────────────────────
alter table sheng_ledger.transactions
  add column if not exists fixed_expense_id uuid
    references sheng_ledger.fixed_expenses (id) on delete set null;
alter table sheng_ledger.transactions add column if not exists fixed_period text;  -- 'YYYY-MM'
alter table sheng_ledger.fixed_expenses add column if not exists last_generated_period text;

-- 把以前靠备注认的自动记账，绑回对应的固定支出
update sheng_ledger.transactions t
  set fixed_expense_id = f.id,
      fixed_period = left(t.date::text, 7)
  from sheng_ledger.fixed_expenses f
  where t.fixed_expense_id is null
    and t.note = '[固定支出] ' || f.name;

update sheng_ledger.fixed_expenses f
  set last_generated_period = sub.p
  from (
    select fixed_expense_id, max(fixed_period) as p
    from sheng_ledger.transactions
    where fixed_expense_id is not null
    group by fixed_expense_id
  ) sub
  where sub.fixed_expense_id = f.id
    and (f.last_generated_period is null or f.last_generated_period < sub.p);

create unique index if not exists transactions_fixed_once
  on sheng_ledger.transactions (fixed_expense_id, fixed_period)
  where fixed_expense_id is not null;

-- 到了扣款日自动记一笔；中间没打开 app 的月份也会补上
create or replace function sheng_ledger.generate_fixed_expenses(p_today date)
returns int
language plpgsql as $$
declare
  fx record;
  cat_id uuid;
  this_month date := date_trunc('month', p_today)::date;
  m date;
  v_period text;
  tx_date date;
  new_id uuid;
  n int := 0;
begin
  select id into cat_id from sheng_ledger.categories
    where type = 'expense' and name = '固定支出' limit 1;
  if cat_id is null then
    insert into sheng_ledger.categories (name, type, color, sort_order)
      values ('固定支出', 'expense', '#C9A88A', 99)
      on conflict (type, name) do nothing
      returning id into cat_id;
    if cat_id is null then
      select id into cat_id from sheng_ledger.categories
        where type = 'expense' and name = '固定支出' limit 1;
    end if;
  end if;

  for fx in
    select f.*, a.currency as acc_currency
    from sheng_ledger.fixed_expenses f
    join sheng_ledger.accounts a on a.id = f.account_id
    for update of f
  loop
    if fx.last_generated_period is null then
      m := this_month;
    else
      m := (to_date(fx.last_generated_period || '-01', 'YYYY-MM-DD') + interval '1 month')::date;
    end if;

    while m <= this_month loop
      tx_date := m + (least(fx.day_of_month,
                            extract(day from (m + interval '1 month' - interval '1 day'))::int) - 1);
      exit when tx_date > p_today;
      v_period := to_char(m, 'YYYY-MM');
      new_id := null;

      -- 旧版本按备注记过的就不再重复记
      if not exists (
        select 1 from sheng_ledger.transactions
        where note = '[固定支出] ' || fx.name and left(date::text, 7) = v_period
      ) then
        insert into sheng_ledger.transactions
          (type, amount, currency, category_id, account_id, note, date, fixed_expense_id, fixed_period)
        values
          ('expense', fx.amount, fx.acc_currency, cat_id, fx.account_id,
           '[固定支出] ' || fx.name, tx_date, fx.id, v_period)
        on conflict (fixed_expense_id, fixed_period) where fixed_expense_id is not null do nothing
        returning id into new_id;

        if new_id is not null then
          update sheng_ledger.accounts set balance = balance - fx.amount where id = fx.account_id;
          n := n + 1;
        end if;
      end if;

      update sheng_ledger.fixed_expenses set last_generated_period = v_period where id = fx.id;
      m := (m + interval '1 month')::date;
    end loop;
  end loop;

  return n;
end $$;

-- ─────────────────────────────────────────────
-- 5. 记账 / 改账 / 删账：账和余额在同一步里改，要么都成功要么都不改
-- ─────────────────────────────────────────────
create or replace function sheng_ledger.create_transaction(
  p_type text, p_amount numeric, p_category_id uuid, p_account_id uuid,
  p_note text, p_date date, p_tag_ids uuid[] default '{}'
) returns uuid
language plpgsql as $$
declare
  acc_currency text;
  new_id uuid;
begin
  if p_amount is null or p_amount <= 0 then raise exception '金额要大于 0'; end if;
  select currency into acc_currency from sheng_ledger.accounts where id = p_account_id;
  if acc_currency is null then raise exception '找不到这个账户'; end if;

  insert into sheng_ledger.transactions (type, amount, currency, category_id, account_id, note, date)
    values (p_type, p_amount, acc_currency, p_category_id, p_account_id, nullif(trim(p_note), ''), p_date)
    returning id into new_id;

  if coalesce(array_length(p_tag_ids, 1), 0) > 0 then
    insert into sheng_ledger.transaction_tags (transaction_id, tag_id)
      select new_id, unnest(p_tag_ids);
    update sheng_ledger.tags set use_count = use_count + 1 where id = any(p_tag_ids);
  end if;

  update sheng_ledger.accounts
    set balance = balance + case when p_type = 'income' then p_amount else -p_amount end
    where id = p_account_id;

  return new_id;
end $$;

create or replace function sheng_ledger.update_transaction(
  p_id uuid, p_type text, p_amount numeric, p_category_id uuid, p_account_id uuid,
  p_note text, p_date date, p_tag_ids uuid[] default '{}'
) returns void
language plpgsql as $$
declare
  prev sheng_ledger.transactions%rowtype;
  acc_currency text;
begin
  if p_amount is null or p_amount <= 0 then raise exception '金额要大于 0'; end if;
  select * into prev from sheng_ledger.transactions where id = p_id for update;
  if not found then raise exception '这笔账已经不在了'; end if;
  select currency into acc_currency from sheng_ledger.accounts where id = p_account_id;
  if acc_currency is null then raise exception '找不到这个账户'; end if;

  -- 先把旧的那笔从余额里退回去，再按新的扣/加
  update sheng_ledger.accounts
    set balance = balance + case when prev.type = 'income' then -prev.amount else prev.amount end
    where id = prev.account_id;
  update sheng_ledger.accounts
    set balance = balance + case when p_type = 'income' then p_amount else -p_amount end
    where id = p_account_id;

  update sheng_ledger.transactions set
    type = p_type, amount = p_amount, currency = acc_currency,
    category_id = p_category_id, account_id = p_account_id,
    note = nullif(trim(p_note), ''), date = p_date
  where id = p_id;

  delete from sheng_ledger.transaction_tags where transaction_id = p_id;
  if coalesce(array_length(p_tag_ids, 1), 0) > 0 then
    insert into sheng_ledger.transaction_tags (transaction_id, tag_id)
      select p_id, unnest(p_tag_ids);
  end if;
end $$;

create or replace function sheng_ledger.delete_transaction(p_id uuid) returns void
language plpgsql as $$
declare prev sheng_ledger.transactions%rowtype;
begin
  select * into prev from sheng_ledger.transactions where id = p_id for update;
  if not found then return; end if;

  update sheng_ledger.accounts
    set balance = balance + case when prev.type = 'income' then -prev.amount else prev.amount end
    where id = prev.account_id;
  delete from sheng_ledger.transaction_tags where transaction_id = p_id;
  delete from sheng_ledger.transactions where id = p_id;
end $$;

-- ─────────────────────────────────────────────
-- 6. 转账：正式的一笔记录，能看能改能删，不算收入也不算支出
-- ─────────────────────────────────────────────
create table if not exists sheng_ledger.transfers (
  id uuid primary key default gen_random_uuid(),
  from_account_id uuid not null references sheng_ledger.accounts (id) on delete cascade,
  to_account_id uuid not null references sheng_ledger.accounts (id) on delete cascade,
  from_amount numeric not null check (from_amount > 0),   -- 转出账户扣多少（转出账户的币种）
  to_amount numeric not null check (to_amount > 0),       -- 转入账户到账多少（转入账户的币种）
  note text,
  date date not null default current_date,
  created_at timestamptz not null default now(),
  check (from_account_id <> to_account_id)
);

create index if not exists transfers_date_idx on sheng_ledger.transfers (date desc);

alter table sheng_ledger.transfers enable row level security;
drop policy if exists "transfers_all" on sheng_ledger.transfers;
create policy "transfers_all" on sheng_ledger.transfers
  for all to anon, authenticated using (true) with check (true);
grant select, insert, update, delete on sheng_ledger.transfers to anon, authenticated;

create or replace function sheng_ledger.create_transfer(
  p_from uuid, p_to uuid, p_from_amount numeric, p_to_amount numeric,
  p_note text, p_date date
) returns uuid
language plpgsql as $$
declare new_id uuid;
begin
  if p_from = p_to then raise exception '转出和转入不能是同一个账户'; end if;
  if p_from_amount is null or p_from_amount <= 0 or p_to_amount is null or p_to_amount <= 0 then
    raise exception '金额要大于 0';
  end if;

  insert into sheng_ledger.transfers (from_account_id, to_account_id, from_amount, to_amount, note, date)
    values (p_from, p_to, p_from_amount, p_to_amount, nullif(trim(p_note), ''), p_date)
    returning id into new_id;

  update sheng_ledger.accounts set balance = balance - p_from_amount where id = p_from;
  update sheng_ledger.accounts set balance = balance + p_to_amount where id = p_to;
  return new_id;
end $$;

create or replace function sheng_ledger.update_transfer(
  p_id uuid, p_from uuid, p_to uuid, p_from_amount numeric, p_to_amount numeric,
  p_note text, p_date date
) returns void
language plpgsql as $$
declare prev sheng_ledger.transfers%rowtype;
begin
  if p_from = p_to then raise exception '转出和转入不能是同一个账户'; end if;
  if p_from_amount is null or p_from_amount <= 0 or p_to_amount is null or p_to_amount <= 0 then
    raise exception '金额要大于 0';
  end if;
  select * into prev from sheng_ledger.transfers where id = p_id for update;
  if not found then raise exception '这笔转账已经不在了'; end if;

  update sheng_ledger.accounts set balance = balance + prev.from_amount where id = prev.from_account_id;
  update sheng_ledger.accounts set balance = balance - prev.to_amount where id = prev.to_account_id;
  update sheng_ledger.accounts set balance = balance - p_from_amount where id = p_from;
  update sheng_ledger.accounts set balance = balance + p_to_amount where id = p_to;

  update sheng_ledger.transfers set
    from_account_id = p_from, to_account_id = p_to,
    from_amount = p_from_amount, to_amount = p_to_amount,
    note = nullif(trim(p_note), ''), date = p_date
  where id = p_id;
end $$;

create or replace function sheng_ledger.delete_transfer(p_id uuid) returns void
language plpgsql as $$
declare prev sheng_ledger.transfers%rowtype;
begin
  select * into prev from sheng_ledger.transfers where id = p_id for update;
  if not found then return; end if;
  update sheng_ledger.accounts set balance = balance + prev.from_amount where id = prev.from_account_id;
  update sheng_ledger.accounts set balance = balance - prev.to_amount where id = prev.to_account_id;
  delete from sheng_ledger.transfers where id = p_id;
end $$;

grant execute on function
  sheng_ledger.current_rate(),
  sheng_ledger.generate_fixed_expenses(date),
  sheng_ledger.create_transaction(text, numeric, uuid, uuid, text, date, uuid[]),
  sheng_ledger.update_transaction(uuid, text, numeric, uuid, uuid, text, date, uuid[]),
  sheng_ledger.delete_transaction(uuid),
  sheng_ledger.create_transfer(uuid, uuid, numeric, numeric, text, date),
  sheng_ledger.update_transfer(uuid, uuid, uuid, numeric, numeric, text, date),
  sheng_ledger.delete_transfer(uuid)
to anon, authenticated;

commit;

-- 让接口马上认出新的表和函数
notify pgrst, 'reload schema';
