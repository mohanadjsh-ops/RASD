import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { writeAuditLog } from "@/lib/audit";

export async function PUT(request: Request) {
  const session = await requireUser("ar");
  const payload = await request.json();
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("user_settings")
    .upsert({ ...payload, user_id: session.user.id }, { onConflict: "user_id" })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  await writeAuditLog({ userId: session.user.id, action: "alert_settings_update", entityType: "user_settings", entityId: data.id });
  return NextResponse.json(data);
}
