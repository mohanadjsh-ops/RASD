import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { sendTelegramAlert } from "@/lib/notifications/telegram-provider";
import { rateLimit } from "@/lib/rate-limit";
import { writeAuditLog } from "@/lib/audit";

export async function POST() {
  const session = await requireAdmin("ar");
  const limited = rateLimit(`telegram-test:${session.user.id}`, 5, 60_000);
  if (!limited.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const result = await sendTelegramAlert({
    headline: "اختبار تنبيه رصد عبر تيليغرام يعمل وفق الإعدادات الحالية بنجاح الآن",
    verificationStatus: "test",
    confidenceScore: 100,
    verificationReason: "This is a manual Telegram test from the Rasd admin dashboard.",
    sourceLinks: ["https://telegram.org"]
  });

  await writeAuditLog({
    userId: session.user.id,
    action: "telegram_test_alert",
    entityType: "notification_channel",
    metadata: { ok: true }
  });

  return NextResponse.json(result);
}
