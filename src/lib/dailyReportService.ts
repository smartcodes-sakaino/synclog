import { query, queryOne } from "@/lib/db";
import { getPrimaryGoogleAccount } from "@/lib/googleAccounts";
import { summarizeDailyWork } from "@/lib/gemini";
import { createGmailDraft } from "@/lib/google/gmail";
import { checkShouldSkipDailyReport } from "@/lib/dailyReportSkip";
import {
  DAILY_REPORT_TO,
  buildDailyReportBody,
  buildDailyReportSubject,
} from "@/lib/dailyReportTemplate";
import type { DailyReport, WorkItem } from "@/types";

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

export interface DailyReportPreview {
  reportDate: string;
  clockIn: string;
  clockOut: string;
  comment: string;
  workItems: WorkItem[];
  subject: string;
  body: string;
}

export async function buildDailyReportPreview(userId: string, dateISO: string): Promise<DailyReportPreview> {
  const existing = await queryOne<DailyReport>(
    "select * from daily_reports where user_id = $1 and report_date = $2",
    [userId, dateISO]
  );

  let workItems: WorkItem[] = existing?.work_items ?? [];
  if (workItems.length === 0) {
    const titles = await getCompletedTaskTitlesForDate(userId, dateISO);
    workItems = await summarizeDailyWork(titles);
  }

  const clockIn = existing?.clock_in ?? "09:00";
  const clockOut = existing?.clock_out ?? "18:00";
  const comment = existing?.comment ?? "";

  return {
    reportDate: dateISO,
    clockIn,
    clockOut,
    comment,
    workItems,
    subject: buildDailyReportSubject(dateISO),
    body: buildDailyReportBody({ dateISO, clockIn, clockOut, comment, workItems }),
  };
}

export interface GenerateOptions {
  respectSkipRules: boolean;
  comment?: string;
  clockIn?: string;
  clockOut?: string;
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
  clockIn?: string;
  clockOut?: string;
  comment?: string | null;
  workItems?: WorkItem[];
  gmailDraftId?: string | null;
  status: DailyReport["status"];
  skipReason?: string | null;
}): Promise<DailyReport> {
  const [report] = await query<DailyReport>(
    `insert into daily_reports
       (user_id, report_date, clock_in, clock_out, comment, work_items, gmail_draft_id, status, skip_reason)
     values ($1, $2, coalesce($3, '09:00'), coalesce($4, '18:00'), $5, coalesce($6::jsonb, '[]'::jsonb), $7, $8, $9)
     on conflict (user_id, report_date) do update set
       clock_in = coalesce(excluded.clock_in, daily_reports.clock_in),
       clock_out = coalesce(excluded.clock_out, daily_reports.clock_out),
       comment = coalesce(excluded.comment, daily_reports.comment),
       work_items = coalesce(excluded.work_items, daily_reports.work_items),
       gmail_draft_id = coalesce(excluded.gmail_draft_id, daily_reports.gmail_draft_id),
       status = excluded.status,
       skip_reason = excluded.skip_reason
     returning *`,
    [
      row.userId,
      row.dateISO,
      row.clockIn ?? null,
      row.clockOut ?? null,
      row.comment ?? null,
      row.workItems ? JSON.stringify(row.workItems) : null,
      row.gmailDraftId ?? null,
      row.status,
      row.skipReason ?? null,
    ]
  );
  return report;
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
    const clockIn = options.clockIn ?? preview.clockIn;
    const clockOut = options.clockOut ?? preview.clockOut;
    const comment = options.comment ?? preview.comment;
    const workItems = options.workItems ?? preview.workItems;

    const subject = buildDailyReportSubject(dateISO);
    const body = buildDailyReportBody({ dateISO, clockIn, clockOut, comment, workItems });

    const draftId = await createGmailDraft(primaryAccount, DAILY_REPORT_TO, subject, body);

    const report = await upsertDailyReport({
      userId,
      dateISO,
      clockIn,
      clockOut,
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
