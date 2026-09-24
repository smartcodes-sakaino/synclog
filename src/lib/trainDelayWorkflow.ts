import { todayJST } from "@/lib/jstDate";

const GOOGLE_FORM_BASE_URL =
  "https://docs.google.com/forms/d/e/1FAIpQLSeEITvmvYlIrhocl36-uyuQN6SSuxh6sUOCwN5mOPV3jEPsWw/viewform";

// entry IDはフォームのFB_PUBLIC_LOAD_DATA_を解析して取得したもの(フォーム作成者が別人のため
// 「事前入力したリンクを取得」機能が使えず、保存済みHTMLから直接解析した)
const ENTRY = {
  approval: 644130205,
  employeeNumber: 495410402,
  unit: 2010404639,
  name: 1003236371,
  applicationType: 1772523848,
  targetDate: 848201859,
  reason: 1283917642,
  delayCertificateUrl: 328247173,
} as const;

const EMPLOYEE_NUMBER = "td240042";
const UNIT_NAME = "社長室";
const FULL_NAME = "境野巧己";
const APPROVAL_TEXT = "事後のため、ユニットマネージャーに報告し事後承認を得ました。";
const APPLICATION_TYPE = "出勤・退勤時間修正申請";
const REASON = "電車遅延";

// 埼京線・7時〜10時帯(JR東日本 運行情報サイトのURLパターンから確認済み)
const JR_LINE_CODE = "09";
const JR_TIME_BAND = "02";

export function buildDelayCertificateUrl(dateISO: string = todayJST()): string {
  const yyyymmdd = dateISO.replace(/-/g, "");
  return `https://traininfo.jreast.co.jp/delay_certificate/pop.aspx?D=${yyyymmdd}&R=${JR_LINE_CODE}&T=${JR_TIME_BAND}`;
}

export function buildTrainDelayFormUrl(dateISO: string = todayJST()): string {
  const params = new URLSearchParams({
    usp: "pp_url",
    [`entry.${ENTRY.approval}`]: APPROVAL_TEXT,
    [`entry.${ENTRY.employeeNumber}`]: EMPLOYEE_NUMBER,
    [`entry.${ENTRY.unit}`]: UNIT_NAME,
    [`entry.${ENTRY.name}`]: FULL_NAME,
    [`entry.${ENTRY.applicationType}`]: APPLICATION_TYPE,
    [`entry.${ENTRY.targetDate}`]: dateISO,
    [`entry.${ENTRY.reason}`]: REASON,
    [`entry.${ENTRY.delayCertificateUrl}`]: buildDelayCertificateUrl(dateISO),
  });
  return `${GOOGLE_FORM_BASE_URL}?${params.toString()}`;
}
