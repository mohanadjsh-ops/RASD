import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  await requireUser("ar");
  const supabase = await createSupabaseServerClient();
  const since = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from("alerts")
    .select("id,created_at")
    .eq("channel_type", "telegram")
    .eq("status", "sent")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(1);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ hasRecentTelegramAlert: Boolean(data?.length), latestAlertAt: data?.[0]?.created_at ?? null });
}
