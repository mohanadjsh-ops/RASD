import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

export async function GET() {
  const session = await requireUser("ar");
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase.from("notification_channels").select("*").eq("user_id", session.user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}
