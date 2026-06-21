import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { writeAuditLog } from "@/lib/audit";

const sourceSchema = z.object({
  name: z.string().min(2),
  url: z.string().url(),
  feed_url: z.string().url(),
  source_type: z.enum(["official", "major_agency", "trusted_media", "monitoring_only"]),
  language: z.string().min(2),
  country: z.string().optional(),
  category: z.string().optional(),
  credibility_weight: z.number().int().min(0).max(100),
  enabled: z.boolean().default(true)
});

export async function POST(request: Request) {
  const session = await requireAdmin("ar");
  const payload = sourceSchema.parse(await request.json());
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase.from("sources").insert(payload).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  await writeAuditLog({ userId: session.user.id, action: "source_create", entityType: "source", entityId: data.id });
  return NextResponse.json(data);
}
