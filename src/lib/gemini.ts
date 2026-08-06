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
  tomorrowDueTitles: string[];
  tomorrowEventTitles: string[];
}

const TIME_LABEL: Record<CompanionContext["timeOfDay"], string> = {
  morning: "朝",
  midday: "昼",
  evening: "夕方",
  night: "夜",
};

function listOrNone(items: string[]): string {
  return items.length > 0 ? items.join("、") : "なし";
}

// マイページの相棒キャラクターが話す、RPGの字幕のような一言セリフを生成する
export async function generateCompanionMessage(context: CompanionContext): Promise<string> {
  const ai = getClient();
  const response = await ai.models.generateContent({
    model: MODEL,
    contents: [
      "あなたはタスク管理アプリ「SyncLog」に住む、クマの相棒キャラクターです。",
      "ユーザーの1日に寄り添い、RPGのキャラクターのような短い一言セリフを日本語で返してください。",
      "口調は親しみやすく前向きな敬語(です・ます調)。絵文字や記号、鍵括弧、名前の名乗りは付けず、セリフ本文のみを1文で返してください。25〜35文字程度を目安にしてください。",
      "",
      `現在の時間帯: ${TIME_LABEL[context.timeOfDay]}`,
      `今日が期限のタスク: ${listOrNone(context.dueTodayTitles)}`,
      `今日完了したタスク: ${listOrNone(context.completedTodayTitles)}`,
      `明日が期限のタスク: ${listOrNone(context.tomorrowDueTitles)}`,
      `明日の予定: ${listOrNone(context.tomorrowEventTitles)}`,
      "",
      "優先順位:",
      "①今日完了したタスクがあれば労いつつ、内容によってはスキル欄の更新をさりげなく提案する",
      "②今日期限のタスクがあれば応援しつつ触れる",
      "③明日が期限のタスクや明日の予定の情報がある場合(定時前の時間帯のみ渡されます)は、それとなく明日の準備を促す一言を話す",
      "④どれにも当てはまらなければ、時間帯に合った挨拶や気軽な雑談に加えて、日頃の頑張りをさりげなく褒める一言を話す(同じ褒め方の繰り返しにならないよう、毎回違う切り口にする)。",
    ].join("\n"),
  });

  return (response.text ?? "").trim();
}

interface SkillEntry {
  title: string;
  description: string | null;
  years?: number | null;
}

function formatSkillLine(s: SkillEntry): string {
  const yearsPart = s.years ? `(${s.years}年)` : "";
  const descPart = s.description ? `: ${s.description}` : "";
  return `- ${s.title}${yearsPart}${descPart}`;
}

// 登録済みのスキル・職務経歴メモから、職務経歴書として使える文章を整形する
export async function generateResume(skills: SkillEntry[], experience: SkillEntry[]): Promise<string> {
  const ai = getClient();
  const skillLines = skills.map(formatSkillLine).join("\n") || "(登録なし)";
  const experienceLines = experience.map(formatSkillLine).join("\n") || "(登録なし)";

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

export interface SocialLevelResult {
  level: number;
  reasoning: string;
}

// 登録済みのスキル・職務経歴から、1〜100の「社会人レベル」をAIが判定する
export async function assessSocialLevel(skills: SkillEntry[], experience: SkillEntry[]): Promise<SocialLevelResult> {
  const ai = getClient();
  const skillLines = skills.map(formatSkillLine).join("\n") || "(登録なし)";
  const experienceLines = experience.map(formatSkillLine).join("\n") || "(登録なし)";

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: [
      "以下はある人物のスキル一覧と職務経歴です。これをもとに、1〜100の「社会人レベル」を判定してください。",
      "1に近いほど新人・未経験レベル、100に近いほど業界トップクラスの熟練者レベルです。",
      "スキルの年数・幅・職務経歴の量や深さから、100段階の中でできるだけ細かく妥当な数値を判定してください。",
      "情報が少ない場合は控えめな数値にしてください。誇張はしないでください。",
      "",
      "■スキル一覧",
      skillLines,
      "",
      "■職務経歴メモ",
      experienceLines,
    ].join("\n"),
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          level: { type: Type.INTEGER },
          reasoning: { type: Type.STRING },
        },
        required: ["level", "reasoning"],
      },
    },
  });

  const parsed = JSON.parse(response.text ?? '{"level":1,"reasoning":""}') as SocialLevelResult;
  return { level: Math.min(100, Math.max(1, Math.round(parsed.level))), reasoning: parsed.reasoning };
}
