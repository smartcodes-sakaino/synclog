import { GoogleGenAI, Type } from "@google/genai";
import type { WorkItem } from "@/types";

const MODEL = "gemini-2.5-flash";

function getClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY が設定されていません");
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
      "実務報告らしい簡潔な日本語の文章に整え、それぞれの作業に想定所要時間(h、0.5刻み)を割り振ってください。",
      "所要時間の合計はおよそ8.0hになるように調整してください。",
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
            hours: { type: Type.NUMBER },
          },
          required: ["title", "hours"],
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
