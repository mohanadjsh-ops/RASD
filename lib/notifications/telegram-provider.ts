import "server-only";
import { serverEnv } from "@/lib/env";

export type TelegramAlertInput = {
  chatId?: string;
  headline: string;
  verificationStatus: string;
  confidenceScore: number;
  verificationReason: string;
  sourceLinks: string[];
  mediaLinks?: string[];
  firstSeenAt?: string;
  sourceName?: string;
  publishedAt?: string | null;
  dashboardUrl?: string;
};

export async function sendTelegramAlert(input: TelegramAlertInput) {
  if (!serverEnv.TELEGRAM_BOT_TOKEN) {
    throw new Error("TELEGRAM_BOT_TOKEN is missing.");
  }

  const chatId = input.chatId ?? serverEnv.TELEGRAM_DEFAULT_CHAT_ID;
  if (!chatId) throw new Error("TELEGRAM_DEFAULT_CHAT_ID is missing.");

  const text = formatTelegramAlert(input);
  const response = await fetch(`https://api.telegram.org/bot${serverEnv.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "HTML",
      disable_web_page_preview: false
    })
  });

  const result = await response.json();
  if (!response.ok || !result.ok) {
    throw new Error(result.description ?? "Telegram sendMessage failed.");
  }
  return result;
}

function formatTelegramAlert(input: TelegramAlertInput) {
  const sources = input.sourceLinks.length
    ? input.sourceLinks.map((link, index) => `${index + 1}. ${escapeHtml(link)}`).join("\n")
    : "لا توجد روابط مصادر مرفقة.";
  const media = input.mediaLinks?.length ? `\n\n<b>وسائط</b>\n${input.mediaLinks.map((link) => escapeHtml(link)).join("\n")}` : "";
  const dashboard = input.dashboardUrl ? `\n\n<a href="${escapeHtml(input.dashboardUrl)}">فتح الخبر في رصد</a>` : "";
  const published = input.publishedAt ?? input.firstSeenAt;

  return [
    "<b>رصد | عاجل مؤكد</b>",
    "",
    `<b>${escapeHtml(input.headline)}</b>`,
    input.sourceName ? `المصدر: ${escapeHtml(input.sourceName)}` : "",
    published ? `وقت النشر: ${escapeHtml(formatMakkahTime(published))}` : "",
    `الحالة: ${escapeHtml(localizeStatus(input.verificationStatus))}`,
    `درجة الثقة: ${input.confidenceScore}%`,
    `سبب الاعتماد: ${escapeHtml(input.verificationReason)}`,
    "",
    "<b>روابط المصادر</b>",
    sources,
    media,
    dashboard
  ]
    .filter(Boolean)
    .join("\n");
}

function localizeStatus(status: string) {
  const labels: Record<string, string> = {
    confirmed: "مؤكد",
    high_confidence: "ثقة عالية",
    likely: "مرجح",
    monitoring: "قيد الرصد",
    unverified: "غير موثق"
  };
  return labels[status] ?? status;
}

function formatMakkahTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ar-SA", {
    timeZone: "Asia/Riyadh",
    dateStyle: "medium",
    timeStyle: "medium"
  }).format(date);
}

function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
