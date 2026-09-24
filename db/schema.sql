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
  -- 最後に(再)連携した日時。OAuth同意画面が「テスト」公開のままだと
  -- リフレッシュトークンが7日で失効するため、再連携を促す警告バナーの判定に使う
  connected_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (user_id, google_email)
);

create table if not exists tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  name text not null,
  color_key text not null,
  sort_order integer not null default 0,
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

-- Dashboard(よく使うリンクをまとめたカード)
create table if not exists routines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  title text not null,
  memo text,
  status text not null default 'active' check (status in ('active', 'archived')),
  links jsonb not null default '[]',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_routines_user_status on routines(user_id, status);

-- ワークフロー(定型業務をワンクリックで実行するボタン集。
-- kind='gmail_draft'はto_emails/subject/bodyを、kind='slack_create_channel'はconfigを使う)
create table if not exists workflows (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  kind text not null default 'gmail_draft' check (kind in ('gmail_draft', 'slack_create_channel', 'train_delay', 'commute_expense')),
  title text not null,
  to_emails text,
  subject text,
  body text,
  config jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_workflows_user on workflows(user_id);

-- Slack連携(ワークスペースごとに複数保存できる。Slackのトークンはワークスペース単位で
-- 発行されるため、Googleアカウントと同様に複数行を許容する)
create table if not exists slack_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  workspace_id text not null,
  workspace_name text not null,
  slack_user_id text not null,
  access_token_encrypted text not null,
  scopes text,
  created_at timestamptz not null default now(),
  unique (user_id, workspace_id)
);
create index if not exists idx_slack_accounts_user on slack_accounts(user_id);

-- マイページ「個人スキル」(スキル一覧・職務経歴を1テーブルでcategoryで区別する)
create table if not exists skills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  category text not null default 'skill' check (category in ('skill', 'experience')),
  title text not null,
  description text,
  years numeric,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_skills_user_category on skills(user_id, category);

-- マイページ「社会人レベル」(1〜100、AIがスキル・職務経歴から判定してキャッシュしておく。
-- 毎回自動判定はしない=ボタン操作時のみGemini呼び出し)
create table if not exists user_levels (
  user_id uuid primary key references users(id) on delete cascade,
  level integer not null default 1 check (level between 1 and 100),
  reasoning text,
  updated_at timestamptz not null default now()
);

-- マイページ「半年目標」(現在の目標1件のみ保持。期間はReviewの初期値としても使う)
create table if not exists goals (
  user_id uuid primary key references users(id) on delete cascade,
  content text,
  period_start date,
  period_end date,
  updated_at timestamptz not null default now()
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
alter table routines enable row level security;
alter table workflows enable row level security;
alter table slack_accounts enable row level security;
alter table skills enable row level security;
alter table user_levels enable row level security;
alter table goals enable row level security;
