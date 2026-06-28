import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  await requireUser("ar");
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("osint_temp_storage_bytes");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const usedBytes = Number(data ?? 0);
  const quotaBytes = 1024 * 1024 * 1024;
  return NextResponse.json({
    usedBytes,
    quotaBytes,
    percentage: Math.round((usedBytes / quotaBytes) * 10_000) / 100,
    acceptingTelegramFiles: usedBytes / quotaBytes < 0.9
  });
}
