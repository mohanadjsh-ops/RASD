import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "Email alerts are disabled. Use /api/alerts/telegram/test or ingestion-triggered Telegram alerts." },
    { status: 410 }
  );
}
