import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { serverEnv } from "@/lib/env";
import { writeAuditLog } from "@/lib/audit";

export async function POST() {
  const session = await requireAdmin("ar");
  if (!serverEnv.TELEGRAM_OSINT_BOT_TOKEN || !serverEnv.TELEGRAM_OSINT_WEBHOOK_SECRET || !serverEnv.APP_BASE_URL) {
    return NextResponse.json(
      { error: "أضف TELEGRAM_OSINT_BOT_TOKEN وTELEGRAM_OSINT_WEBHOOK_SECRET وAPP_BASE_URL أولا." },
      { status: 503 }
    );
  }

  const webhookUrl = `${serverEnv.APP_BASE_URL.replace(/\/$/, "")}/api/osint/telegram/webhook`;
  const response = await fetch(`https://api.telegram.org/bot${serverEnv.TELEGRAM_OSINT_BOT_TOKEN}/setWebhook`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      url: webhookUrl,
      secret_token: serverEnv.TELEGRAM_OSINT_WEBHOOK_SECRET,
      allowed_updates: ["message"]
    })
  });
  const result = await response.json();
  if (!response.ok || !result.ok) {
    return NextResponse.json({ error: result.description ?? "تعذر إعداد webhook." }, { status: 502 });
  }

  await writeAuditLog({
    userId: session.user.id,
    action: "osint_telegram_webhook_setup",
    entityType: "osint_telegram_bot",
    metadata: { webhook_url: webhookUrl }
  });
  return NextResponse.json({ ok: true, webhookUrl });
}
