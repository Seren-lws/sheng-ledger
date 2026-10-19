-- 声声记账本：推送提醒
-- 在 Supabase 网页 → SQL Editor 里整段粘贴运行一次即可（重复运行也安全）
-- 注意：__CRON_SECRET__ 要换成 Vercel 环境变量 CRON_SECRET 的值再运行

-- ─────────────────────────────────────────────
-- 1. 这台手机的推送地址（每台开启提醒的设备一行）
-- ─────────────────────────────────────────────
create table if not exists sheng_ledger.push_subscriptions (
  endpoint text primary key,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────
-- 2. 提醒设置（只有一行）
-- ─────────────────────────────────────────────
create table if not exists sheng_ledger.reminder_settings (
  id int primary key default 1 check (id = 1),
  evening_enabled boolean not null default false,
  evening_time text not null default '21:00',    -- 今天还没记的话，几点提醒
  morning_enabled boolean not null default true,
  morning_time text not null default '09:00',    -- 昨天整天空着的话，第二天几点提醒补记
  last_evening_sent date,
  last_morning_sent date,
  updated_at timestamptz not null default now()
);
insert into sheng_ledger.reminder_settings (id) values (1) on conflict (id) do nothing;

alter table sheng_ledger.push_subscriptions enable row level security;
alter table sheng_ledger.reminder_settings enable row level security;
drop policy if exists "push_subscriptions_all" on sheng_ledger.push_subscriptions;
create policy "push_subscriptions_all" on sheng_ledger.push_subscriptions
  for all to anon, authenticated using (true) with check (true);
drop policy if exists "reminder_settings_all" on sheng_ledger.reminder_settings;
create policy "reminder_settings_all" on sheng_ledger.reminder_settings
  for all to anon, authenticated using (true) with check (true);
grant select, insert, update, delete on sheng_ledger.push_subscriptions to anon, authenticated;
grant select, insert, update, delete on sheng_ledger.reminder_settings to anon, authenticated;

-- ─────────────────────────────────────────────
-- 3. 每 15 分钟叫一次记账本，让它看看要不要发提醒
-- ─────────────────────────────────────────────
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'sheng-ledger-remind',
  '*/15 * * * *',
  $$
    select net.http_post(
      url := 'https://sheng-ledger.vercel.app/api/cron/remind',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer __CRON_SECRET__"}'::jsonb,
      body := '{}'::jsonb
    );
  $$
);

notify pgrst, 'reload schema';
