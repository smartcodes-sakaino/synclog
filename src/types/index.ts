export type Priority = "high" | "medium" | "low";
export type TaskStatus = "todo" | "in_progress" | "done";
export type TaskSource = "manual" | "minutes_extraction";
export type FuzzyTaskStatus = "open" | "resolved";
export type DailyReportStatus = "draft_created" | "skipped" | "failed" | "pending";
export type MinuteSourceType = "recurring" | "adhoc";
export type ExtractedTaskStatus = "pending" | "imported" | "dismissed";
export type RoutineStatus = "active" | "archived";

export interface User {
  id: string;
  email: string;
  display_name: string | null;
  created_at: string;
}

export interface Tag {
  id: string;
  user_id: string;
  name: string;
  color_key: string;
  sort_order: number;
  created_at: string;
}

export interface Task {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  priority: Priority;
  status: TaskStatus;
  source: TaskSource;
  source_ref: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  tags: Tag[];
}

export interface FuzzyTask {
  id: string;
  user_id: string;
  title: string;
  memo: string | null;
  status: FuzzyTaskStatus;
  created_at: string;
  updated_at: string;
}

export interface GoogleAccount {
  id: string;
  user_id: string;
  google_email: string;
  account_label: string | null;
  color_key: string;
  token_expiry: string | null;
  scopes: string | null;
  created_at: string;
}

export interface WorkItem {
  title: string;
  hours: number;
}

export interface DailyReport {
  id: string;
  user_id: string;
  report_date: string;
  clock_in: string;
  clock_out: string;
  comment: string | null;
  work_items: WorkItem[];
  gmail_draft_id: string | null;
  status: DailyReportStatus;
  skip_reason: string | null;
  created_at: string;
}

export interface TagBreakdownEntry {
  tag: string;
  percentage: number;
}

export interface ReviewSummary {
  id: string;
  user_id: string;
  period_start: string;
  period_end: string;
  summary_text: string;
  tag_breakdown: TagBreakdownEntry[];
  created_at: string;
}

export interface MinuteSource {
  id: string;
  user_id: string;
  type: MinuteSourceType;
  doc_url: string;
  title: string | null;
  last_checked_at: string | null;
  created_at: string;
}

export interface ExtractedTask {
  id: string;
  user_id: string;
  minute_source_id: string | null;
  title: string;
  description: string | null;
  suggested_due_date: string | null;
  status: ExtractedTaskStatus;
  created_at: string;
}

export interface Routine {
  id: string;
  user_id: string;
  title: string;
  memo: string | null;
  status: RoutineStatus;
  created_at: string;
  updated_at: string;
  tags: Tag[];
}

export interface CalendarEvent {
  id: string;
  accountEmail: string;
  accountColorKey: string;
  title: string;
  start: string;
  end: string;
  allDay: boolean;
}

export interface CalendarEventLine {
  time: string;
  title: string;
}

export interface SessionData {
  userId: string;
  email: string;
  loggedInAt: number;
}
