import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { writeAuditLog } from "@/lib/audit";

const settingsSchema = z.object({
  alert_email: z.string().email().nullable().optional(),
  enable_email_alerts: z.boolean().optional(),
  enable_telegram_alerts: z.boolean().optional()
});

export async function GET() {
  const session = await requireUser("ar");
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase.from("user_settings").select("*").eq("user_id", session.user.id).maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(
    data ?? {
      user_id: session.user.id,
      alert_email: session.profile?.email ?? "",
      enable_email_alerts: false,
      enable_telegram_alerts: true
    }
  );
}

export async function PUT(request: Request) {
  const session = await requireUser("ar");
  const payload = settingsSchema.parse(await request.json());
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("user_settings")
    .upsert(
      {
        ...payload,
        alert_email: payload.alert_email || null,
        user_id: session.user.id,
        updated_at: new Date().toISOString()
      },
      { onConflict: "user_id" }
    )
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  await writeAuditLog({ userId: session.user.id, action: "alert_settings_update", entityType: "user_settings", entityId: data.id });
  return NextResponse.json(data);
}
