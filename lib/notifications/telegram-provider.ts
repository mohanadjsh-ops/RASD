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
    : "No source links attached.";
  const media = input.mediaLinks?.length ? `\n\n<b>Media</b>\n${input.mediaLinks.map((link) => escapeHtml(link)).join("\n")}` : "";
  const dashboard = input.dashboardUrl ? `\n\n<a href="${escapeHtml(input.dashboardUrl)}">Open Rasd dashboard</a>` : "";

  return [
    "<b>Rasd Alert</b>",
    "",
    `<b>${escapeHtml(input.headline)}</b>`,
    `Status: ${escapeHtml(input.verificationStatus)}`,
    `Confidence: ${input.confidenceScore}%`,
    `Basis: ${escapeHtml(input.verificationReason)}`,
    input.firstSeenAt ? `First seen: ${escapeHtml(input.firstSeenAt)}` : "",
    "",
    "<b>Sources</b>",
    sources,
    media,
    dashboard
  ]
    .filter(Boolean)
    .join("\n");
}

function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
