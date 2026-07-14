import { getSupabaseAdmin } from "@/lib/supabase";
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
  const supabase = getSupabaseAdmin();
  const start = `${dateISO}T00:00:00+09:00`;
  const end = `${dateISO}T23:59:59+09:00`;
  const { data, error } = await supabase
    .from("tasks")
    .select("title")
    .eq("user_id", userId)
    .eq("status", "done")
    .gte("completed_at", start)
    .lte("completed_at", end);

  if (error) throw error;
  return (data ?? []).map((t) => t.title as string);
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
  const supabase = getSupabaseAdmin();
  const { data: existing } = await supabase
    .from("daily_reports")
    .select("*")
    .eq("user_id", userId)
    .eq("report_date", dateISO)
    .maybeSingle();

  let workItems: WorkItem[] = (existing?.work_items as WorkItem[] | undefined) ?? [];
  if (workItems.length === 0) {
    const titles = await getCompletedTaskTitlesForDate(userId, dateISO);
    workItems = await summarizeDailyWork(titles);
  }

  const clockIn = existing?.clock_in ?? "09:00";
  const clockOut = existing?.clock_out ?? "18:00";
  const comment = existing?.comment ?? "";
  const reportDate = new Date(`${dateISO}T00:00:00+09:00`);

  return {
    reportDate: dateISO,
    clockIn,
    clockOut,
    comment,
    workItems,
    subject: buildDailyReportSubject(reportDate),
    body: buildDailyReportBody({ reportDate, clockIn, clockOut, comment, workItems }),
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

export async function generateDailyReport(
  userId: string,
  dateISO: string,
  options: GenerateOptions
): Promise<GenerateResult> {
  const supabase = getSupabaseAdmin();
  const primaryAccount = await getPrimaryGoogleAccount(userId);

  if (!primaryAccount) {
    return { status: "failed", reason: "Googleアカウントが連携されていません" };
  }

  if (options.respectSkipRules) {
    const targetDate = new Date(`${dateISO}T00:00:00+09:00`);
    const skip = await checkShouldSkipDailyReport(primaryAccount, dateISO, targetDate);
    if (skip.shouldSkip) {
      await supabase.from("daily_reports").upsert(
        {
          user_id: userId,
          report_date: dateISO,
          status: "skipped",
          skip_reason: skip.reason,
        },
        { onConflict: "user_id,report_date" }
      );
      return { status: "skipped", reason: skip.reason ?? undefined };
    }
  }

  try {
    const preview = await buildDailyReportPreview(userId, dateISO);
    const clockIn = options.clockIn ?? preview.clockIn;
    const clockOut = options.clockOut ?? preview.clockOut;
    const comment = options.comment ?? preview.comment;
    const workItems = options.workItems ?? preview.workItems;
    const reportDate = new Date(`${dateISO}T00:00:00+09:00`);

    const subject = buildDailyReportSubject(reportDate);
    const body = buildDailyReportBody({ reportDate, clockIn, clockOut, comment, workItems });

    const draftId = await createGmailDraft(primaryAccount, DAILY_REPORT_TO, subject, body);

    const { data: report, error } = await supabase
      .from("daily_reports")
      .upsert(
        {
          user_id: userId,
          report_date: dateISO,
          clock_in: clockIn,
          clock_out: clockOut,
          comment,
          work_items: workItems,
          gmail_draft_id: draftId,
          status: "draft_created",
          skip_reason: null,
        },
        { onConflict: "user_id,report_date" }
      )
      .select("*")
      .single();

    if (error) throw error;
    return { status: "draft_created", report };
  } catch (err) {
    const message = err instanceof Error ? err.message : "不明なエラー";
    await supabase.from("daily_reports").upsert(
      {
        user_id: userId,
        report_date: dateISO,
        status: "failed",
        skip_reason: message,
      },
      { onConflict: "user_id,report_date" }
    );
    return { status: "failed", reason: message };
  }
}
