import { GoogleGenAI, Type } from "@google/genai";
import type { WorkItem } from "@/types";

const MODEL = "gemini-2.5-flash";

function getClient() {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) throw new Error("GOOGLE_AI_API_KEY が設定されていません");
  return new GoogleGenAI({ apiKey });
}

// 完了タスクのタイトル一覧から、日報の「本日の作業内容」箇条書きを生成する
export async function summarizeDailyWork(taskTitles: string[]): Promise<WorkItem[]> {
  if (taskTitles.length === 0) return [];

  const ai = getClient();
  const response = await ai.models.generateContent({
    model: MODEL,
    contents: [
      "以下は本日完了した業務タスクの一覧です。日報の「本日の作業内容」欄に載せる箇条書きとして、",
      "実務報告らしい簡潔な日本語の文章に整えてください。",
      "",
      ...taskTitles.map((t) => `- ${t}`),
    ].join("\n"),
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
          },
          required: ["title"],
        },
      },
    },
  });

  return JSON.parse(response.text ?? "[]") as WorkItem[];
}

// 期間中に完了したタスクをもとに、定例報告・評価面談用のAI要約文章を生成する
export async function summarizePeriod(
  tasks: { title: string; tags: string[]; completedAt: string }[]
): Promise<string> {
  const ai = getClient();
  const taskLines = tasks
    .map((t) => `- ${t.title}(タグ: ${t.tags.join("/") || "なし"}, 完了日: ${t.completedAt}）`)
    .join("\n");

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: [
      "以下は指定期間中に完了した業務タスクの一覧です。",
      "定例報告や評価面談で使える、実績が伝わる書き言葉の要約文章を2〜3段落で作成してください。",
      "具体的な成果や取り組みの傾向に触れつつ、簡潔にまとめてください。",
      "",
      taskLines || "(この期間に完了したタスクはありません)",
    ].join("\n"),
  });

  return response.text ?? "";
}

export interface ExtractedTaskCandidate {
  title: string;
  description: string;
  suggestedDueDate: string | null;
}

// 議事録本文から、担当者に割り振られたタスク候補を抽出する
export async function extractTasksFromMinutes(docText: string): Promise<ExtractedTaskCandidate[]> {
  const ai = getClient();
  const response = await ai.models.generateContent({
    model: MODEL,
    contents: [
      "以下は会議の議事録です。この中から、自分(境野巧己)が対応すべきタスクを抽出してください。",
      "期限が明記されていない場合はsuggestedDueDateをnullにしてください。",
      "",
      docText,
    ].join("\n"),
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            description: { type: Type.STRING },
            suggestedDueDate: { type: Type.STRING, nullable: true },
          },
          required: ["title", "description"],
        },
      },
    },
  });

  return JSON.parse(response.text ?? "[]") as ExtractedTaskCandidate[];
}

export interface CompanionContext {
  timeOfDay: "morning" | "midday" | "evening" | "night";
  dueTodayTitles: string[];
  completedTodayTitles: string[];
}

const TIME_LABEL: Record<CompanionContext["timeOfDay"], string> = {
  morning: "朝",
  midday: "昼",
  evening: "夕方",
  night: "夜",
};

// マイページの相棒キャラクターが話す、RPGの字幕のような一言セリフを生成する
export async function generateCompanionMessage(context: CompanionContext): Promise<string> {
  const ai = getClient();
  const response = await ai.models.generateContent({
    model: MODEL,
    contents: [
      "あなたはタスク管理アプリ「SyncLog」に住む、クマの相棒キャラクターです。",
      "ユーザーの1日に寄り添い、RPGのキャラクターのような短い一言セリフを日本語で返してください。",
      "口調は親しみやすく前向き、敬語ではなくフランクな話し言葉。絵文字や記号、鍵括弧、名前の名乗りは付けず、セリフ本文のみを1文で返してください。25文字前後を目安にしてください。",
      "",
      `現在の時間帯: ${TIME_LABEL[context.timeOfDay]}`,
      `今日が期限のタスク: ${context.dueTodayTitles.length > 0 ? context.dueTodayTitles.join("、") : "なし"}`,
      `今日完了したタスク: ${context.completedTodayTitles.length > 0 ? context.completedTodayTitles.join("、") : "なし"}`,
      "",
      "優先順位: ①今日完了したタスクがあれば労いつつ、内容によってはスキル欄の更新をさりげなく提案する ②今日期限のタスクがあれば応援しつつ触れる ③どちらもなければ、時間帯に合った挨拶や気軽な雑談を話す。",
    ].join("\n"),
  });

  return (response.text ?? "").trim();
}

// 登録済みのスキル・職務経歴メモから、職務経歴書として使える文章を整形する
export async function generateResume(
  skills: { title: string; description: string | null }[],
  experience: { title: string; description: string | null }[]
): Promise<string> {
  const ai = getClient();
  const skillLines =
    skills.map((s) => `- ${s.title}${s.description ? `: ${s.description}` : ""}`).join("\n") || "(登録なし)";
  const experienceLines =
    experience.map((e) => `- ${e.title}${e.description ? `: ${e.description}` : ""}`).join("\n") || "(登録なし)";

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: [
      "以下はある人物のスキル一覧と職務経歴のメモです。これをもとに、職務経歴書として使える文章を整えてください。",
      "「スキル」セクションと「職務経歴」セクションに分け、職務経歴は簡潔な要約文にしてください。",
      "誇張はせず、渡された情報の範囲で自然な文章に整形するだけにしてください。",
      "",
      "■スキル一覧",
      skillLines,
      "",
      "■職務経歴メモ",
      experienceLines,
    ].join("\n"),
  });

  return response.text ?? "";
}
