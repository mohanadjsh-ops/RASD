import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

export async function GET() {
  await requireAdmin("ar");
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(100);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}
