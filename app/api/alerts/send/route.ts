import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { message: "Email digests are handled by /api/reports/email-digest and protected with CRON_SECRET." },
    { status: 200 }
  );
}
