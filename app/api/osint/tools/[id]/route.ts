import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { writeAuditLog } from "@/lib/audit";

const schema = z.object({
  name: z.string().min(2).max(160).optional(),
  category: z.string().min(2).max(80).optional(),
  url: z.string().url().optional(),
  execution_mode: z.enum(["automatic", "manual"]).optional(),
  access_model: z.enum(["free", "account_required"]).optional(),
  instructions_ar: z.string().max(2000).optional(),
  enabled: z.boolean().optional(),
  last_verified_at: z.string().datetime().nullable().optional()
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin("ar");
  const { id } = await params;
  const payload = schema.parse(await request.json());
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("osint_tools")
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  await writeAuditLog({
    userId: session.user.id,
    action: "osint_tool_update",
    entityType: "osint_tool",
    entityId: id,
    metadata: payload
  });
  return NextResponse.json(data);
}
