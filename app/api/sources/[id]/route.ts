import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

const patchSchema = z.object({
  name: z.string().min(2).optional(),
  url: z.string().url().optional(),
  feed_url: z.string().url().optional(),
  source_type: z.enum(["official", "major_agency", "trusted_media", "monitoring_only"]).optional(),
  language: z.string().min(2).optional(),
  country: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  credibility_weight: z.number().int().min(0).max(100).optional(),
  enabled: z.boolean().optional()
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin("ar");
  const { id } = await params;
  const payload = patchSchema.parse(await request.json());
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("sources")
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  await writeAuditLog({
    userId: session.user.id,
    action: "source_update",
    entityType: "source",
    entityId: id,
    metadata: payload
  });
  return NextResponse.json(data);
}
