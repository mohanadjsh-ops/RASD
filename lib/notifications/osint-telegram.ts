import "server-only";
import { serverEnv } from "@/lib/env";

export async function sendOsintTelegramMessage(chatId: string, text: string) {
  if (!serverEnv.TELEGRAM_OSINT_BOT_TOKEN) throw new Error("TELEGRAM_OSINT_BOT_TOKEN is missing.");
  const response = await fetch(`https://api.telegram.org/bot${serverEnv.TELEGRAM_OSINT_BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "HTML",
      disable_web_page_preview: true
    })
  });
  const result = await response.json();
  if (!response.ok || !result.ok) throw new Error(result.description ?? "Telegram sendMessage failed.");
  return result;
}

export async function downloadOsintTelegramFile(fileId: string) {
  if (!serverEnv.TELEGRAM_OSINT_BOT_TOKEN) throw new Error("TELEGRAM_OSINT_BOT_TOKEN is missing.");
  const infoResponse = await fetch(`https://api.telegram.org/bot${serverEnv.TELEGRAM_OSINT_BOT_TOKEN}/getFile?file_id=${encodeURIComponent(fileId)}`);
  const info = await infoResponse.json();
  if (!infoResponse.ok || !info.ok || !info.result?.file_path) {
    throw new Error(info.description ?? "Telegram getFile failed.");
  }
  const fileResponse = await fetch(
    `https://api.telegram.org/file/bot${serverEnv.TELEGRAM_OSINT_BOT_TOKEN}/${info.result.file_path}`
  );
  if (!fileResponse.ok) throw new Error("Telegram file download failed.");
  return Buffer.from(await fileResponse.arrayBuffer());
}

export function escapeTelegramHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
