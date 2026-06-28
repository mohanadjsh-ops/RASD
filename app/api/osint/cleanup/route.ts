import { NextResponse } from "next/server";
import { serverEnv } from "@/lib/env";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { writeAuditLog } from "@/lib/audit";

export async function POST(request: Request) {
  if (!serverEnv.CRON_SECRET || request.headers.get("x-cron-secret") !== serverEnv.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createSupabaseServiceClient();
  const { data: expired, error } = await supabase
    .from("osint_evidence")
    .select("id,case_id,telegram_object_path,metadata")
    .not("telegram_object_path", "is", null)
    .lte("expires_at", new Date().toISOString())
    .limit(200);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const paths = (expired ?? []).map((item) => item.telegram_object_path).filter(Boolean) as string[];
  if (paths.length) await supabase.storage.from("osint-temp").remove(paths);
  for (const item of expired ?? []) {
    await supabase
      .from("osint_evidence")
      .update({
        telegram_object_path: null,
        expires_at: null,
        metadata: { ...(item.metadata ?? {}), temporary_file_deleted_at: new Date().toISOString() }
      })
      .eq("id", item.id);
  }
  await writeAuditLog({
    action: "osint_temp_cleanup",
    entityType: "osint_storage",
    metadata: { deleted_files: paths.length }
  });
  return NextResponse.json({ deletedFiles: paths.length });
}
