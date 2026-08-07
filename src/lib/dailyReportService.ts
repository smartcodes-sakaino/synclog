import { query, queryOne } from "@/lib/db";
import { getPrimaryGoogleAccount, listGoogleAccountsForUser } from "@/lib/googleAccounts";
import { summarizeDailyWork } from "@/lib/gemini";
import { createGmailDraft } from "@/lib/google/gmail";
import { listMergedEvents } from "@/lib/google/calendar";
import { checkShouldSkipDailyReport } from "@/lib/dailyReportSkip";
import {
  DAILY_REPORT_TO,
  buildDailyReportBody,
  buildDailyReportSubject,
} from "@/lib/dailyReportTemplate";
import type { CalendarEventLine, DailyReport, WorkItem } from "@/types";

async function getCompletedTaskTitlesForDate(userId: string, dateISO: string): Promise<string[]> {
  const start = `${dateISO}T00:00:00+09:00`;
  const end = `${dateISO}T23:59:59+09:00`;
  const rows = await query<{ title: string }>(
    `select title from tasks
     where user_id = $1 and status = 'done' and completed_at >= $2 and completed_at <= $3`,
    [userId, start, end]
  );
  return rows.map((t) => t.title);
}

// 日報の「本日の予定」には不要な、定型の作業ブロック
const EXCLUDED_EVENT_TITLES = ["休憩", "締め作業"];

// 連携済みの全アカウントから、その日のカレンダー予定をそのまま(AI要約せず)取得する
async function getCalendarEventLinesForDate(userId: string, dateISO: string): Promise<CalendarEventLine[]> {
  const accounts = await listGoogleAccountsForUser(userId);
  if (accounts.length === 0) return [];

  const events = await listMergedEvents(
    accounts,
    `${dateISO}T00:00:00+09:00`,
    `${dateISO}T23:59:59+09:00`
  );

  // 終日予定・休憩や締め作業などの定型ブロックは日報には不要なため除外する
  return events
    .filter((e) => !e.allDay && !EXCLUDED_EVENT_TITLES.includes(e.title))
    .map((e) => ({ title: e.title }));
}

// 「AIで生成」ボタンから呼び出す、完了タスクの箇条書き生成(ページ読み込み時には自動実行しない)
export async function summarizeWorkItemsForDate(userId: string, dateISO: string): Promise<WorkItem[]> {
  const titles = await getCompletedTaskTitlesForDate(userId, dateISO);
  return summarizeDailyWork(titles);
}

export interface DailyReportPreview {
  reportDate: string;
  comment: string;
  workItems: WorkItem[];
  calendarEvents: CalendarEventLine[];
  subject: string;
  body: string;
}

export async function buildDailyReportPreview(userId: string, dateISO: string): Promise<DailyReportPreview> {
  const [existing, calendarEvents] = await Promise.all([
    queryOne<DailyReport>("select * from daily_reports where user_id = $1 and report_date = $2", [
      userId,
      dateISO,
    ]),
    getCalendarEventLinesForDate(userId, dateISO),
  ]);

  const workItems: WorkItem[] = existing?.work_items ?? [];
  const comment = existing?.comment ?? "";

  return {
    reportDate: dateISO,
    comment,
    workItems,
    calendarEvents,
    subject: buildDailyReportSubject(dateISO),
    body: buildDailyReportBody({ dateISO, comment, workItems, calendarEvents }),
  };
}

export interface GenerateOptions {
  respectSkipRules: boolean;
  comment?: string;
  workItems?: WorkItem[];
}

export interface GenerateResult {
  status: "draft_created" | "skipped" | "failed";
  reason?: string;
  report?: DailyReport;
}

async function upsertDailyReport(row: {
  userId: string;
  dateISO: string;
  comment?: string | null;
  workItems?: WorkItem[];
  gmailDraftId?: string | null;
  status: DailyReport["status"];
  skipReason?: string | null;
}): Promise<DailyReport> {
  const [report] = await query<DailyReport>(
    `insert into daily_reports
       (user_id, report_date, comment, work_items, gmail_draft_id, status, skip_reason)
     values ($1, $2, $3, coalesce($4::jsonb, '[]'::jsonb), $5, $6, $7)
     on conflict (user_id, report_date) do update set
       comment = coalesce(excluded.comment, daily_reports.comment),
       work_items = coalesce(excluded.work_items, daily_reports.work_items),
       gmail_draft_id = coalesce(excluded.gmail_draft_id, daily_reports.gmail_draft_id),
       status = excluded.status,
       skip_reason = excluded.skip_reason
     returning *`,
    [
      row.userId,
      row.dateISO,
      row.comment ?? null,
      row.workItems ? JSON.stringify(row.workItems) : null,
      row.gmailDraftId ?? null,
      row.status,
      row.skipReason ?? null,
    ]
  );
  return report;
}

// 「報告事項・コメント」欄の入力を、Gmail下書き作成を待たずにその場で保存する(自動保存用)。
// status等の他の列には触れず、comment だけを更新する
export async function saveDailyReportComment(userId: string, dateISO: string, comment: string): Promise<void> {
  await query(
    `insert into daily_reports (user_id, report_date, comment)
     values ($1, $2, $3)
     on conflict (user_id, report_date) do update set comment = excluded.comment`,
    [userId, dateISO, comment]
  );
}

export async function generateDailyReport(
  userId: string,
  dateISO: string,
  options: GenerateOptions
): Promise<GenerateResult> {
  const primaryAccount = await getPrimaryGoogleAccount(userId);

  if (!primaryAccount) {
    return { status: "failed", reason: "Googleアカウントが連携されていません" };
  }

  if (options.respectSkipRules) {
    const skip = await checkShouldSkipDailyReport(primaryAccount, dateISO);
    if (skip.shouldSkip) {
      await upsertDailyReport({ userId, dateISO, status: "skipped", skipReason: skip.reason });
      return { status: "skipped", reason: skip.reason ?? undefined };
    }
  }

  try {
    const preview = await buildDailyReportPreview(userId, dateISO);
    const comment = options.comment ?? preview.comment;
    const workItems = options.workItems ?? preview.workItems;

    const subject = buildDailyReportSubject(dateISO);
    const body = buildDailyReportBody({
      dateISO,
      comment,
      workItems,
      calendarEvents: preview.calendarEvents,
    });

    const draftId = await createGmailDraft(primaryAccount, DAILY_REPORT_TO, subject, body);

    const report = await upsertDailyReport({
      userId,
      dateISO,
      comment,
      workItems,
      gmailDraftId: draftId,
      status: "draft_created",
      skipReason: null,
    });

    return { status: "draft_created", report };
  } catch (err) {
    const message = err instanceof Error ? err.message : "不明なエラー";
    await upsertDailyReport({ userId, dateISO, status: "failed", skipReason: message });
    return { status: "failed", reason: message };
  }
}
