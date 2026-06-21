import { NextResponse } from "next/server";
import { runRssIngestion } from "@/lib/ingestion";
import { serverEnv } from "@/lib/env";
import { rateLimit } from "@/lib/rate-limit";
import { writeAuditLog } from "@/lib/audit";

export async function POST(request: Request) {
  const secret = request.headers.get("x-cron-secret");
  if (!serverEnv.CRON_SECRET || secret !== serverEnv.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const limited = rateLimit("ingest", 5, 60_000);
  if (!limited.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const result = await runRssIngestion();
  await writeAuditLog({ action: "manual_or_scheduled_fetch", entityType: "ingestion", metadata: result });
  return NextResponse.json(result);
}
