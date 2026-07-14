-- SyncLog データベーススキーマ
-- 設計書/DB設計書.xlsx に対応
-- Replit PostgreSQL(Neon連携)に対して psql や SQL実行ツールで流し込む

create extension if not exists pgcrypto;

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  display_name text,
  created_at timestamptz not null default now()
);

create table if not exists google_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  google_email text not null,
  account_label text,
  color_key text not null,
  access_token_encrypted text,
  refresh_token_encrypted text,
  token_expiry timestamptz,
  scopes text,
  created_at timestamptz not null default now(),
  unique (user_id, google_email)
);

create table if not exists tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  name text not null,
  color_key text not null,
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  title text not null,
  description text,
  due_date date,
  priority text not null default 'medium' check (priority in ('high', 'medium', 'low')),
  status text not null default 'todo' check (status in ('todo', 'in_progress', 'done')),
  source text not null default 'manual' check (source in ('manual', 'minutes_extraction')),
  source_ref text,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_tasks_user_status on tasks(user_id, status);
create index if not exists idx_tasks_completed_at on tasks(user_id, completed_at);

create table if not exists task_tags (
  task_id uuid not null references tasks(id) on delete cascade,
  tag_id uuid not null references tags(id) on delete cascade,
  primary key (task_id, tag_id)
);

create table if not exists fuzzy_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  title text not null,
  memo text,
  status text not null default 'open' check (status in ('open', 'resolved')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists daily_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  report_date date not null,
  clock_in time not null default '09:00',
  clock_out time not null default '18:00',
  comment text,
  work_items jsonb not null default '[]',
  gmail_draft_id text,
  status text not null default 'pending' check (status in ('draft_created', 'skipped', 'failed', 'pending')),
  skip_reason text,
  created_at timestamptz not null default now(),
  unique (user_id, report_date)
);

create table if not exists review_summaries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  period_start date not null,
  period_end date not null,
  summary_text text not null,
  tag_breakdown jsonb not null default '[]',
  created_at timestamptz not null default now()
);

create table if not exists minute_sources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  type text not null check (type in ('recurring', 'adhoc')),
  doc_url text not null,
  title text,
  last_checked_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists extracted_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  minute_source_id uuid references minute_sources(id) on delete set null,
  title text not null,
  description text,
  suggested_due_date date,
  status text not null default 'pending' check (status in ('pending', 'imported', 'dismissed')),
  created_at timestamptz not null default now()
);

-- DBへの唯一の経路はNext.jsサーバー(DATABASE_URLを保持するテーブル所有ロール)経由のみで、
-- ブラウザや他のロールから直接クエリを投げる経路は存在しない。
-- 将来的に閲覧専用ロール等を追加する場合に備え、防御的にRow Level Securityを有効化しておく
-- (テーブル所有ロールはRLSの影響を受けないため、現状のアプリの挙動には影響しない)
alter table users enable row level security;
alter table google_accounts enable row level security;
alter table tags enable row level security;
alter table tasks enable row level security;
alter table task_tags enable row level security;
alter table fuzzy_tasks enable row level security;
alter table daily_reports enable row level security;
alter table review_summaries enable row level security;
alter table minute_sources enable row level security;
alter table extracted_tasks enable row level security;
