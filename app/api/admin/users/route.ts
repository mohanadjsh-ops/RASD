import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { writeAuditLog } from "@/lib/audit";

const userSchema = z.object({
  email: z.string().email(),
  password: z.string().min(3),
  fullName: z.string().min(2),
  role: z.enum(["admin", "viewer"])
});

export async function GET() {
  await requireAdmin("ar");
  const supabase = createSupabaseServiceClient();
  const [{ data: authUsers, error: authError }, { data: profiles, error: profileError }] = await Promise.all([
    supabase.auth.admin.listUsers(),
    supabase.from("profiles").select("id,email,full_name,role,created_at").order("created_at", { ascending: false })
  ]);

  if (authError || profileError) {
    return NextResponse.json({ error: authError?.message ?? profileError?.message }, { status: 400 });
  }

  const profileMap = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
  const users = authUsers.users.map((user) => ({
    id: user.id,
    email: user.email,
    created_at: user.created_at,
    profile: profileMap.get(user.id) ?? null
  }));

  return NextResponse.json(users);
}

export async function POST(request: Request) {
  const session = await requireAdmin("ar");
  const payload = userSchema.parse(await request.json());
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase.auth.admin.createUser({
    email: payload.email,
    password: payload.password,
    email_confirm: true,
    user_metadata: { full_name: payload.fullName }
  });

  if (error || !data.user) return NextResponse.json({ error: error?.message ?? "User creation failed" }, { status: 400 });

  const { error: profileError } = await supabase.from("profiles").upsert({
    id: data.user.id,
    email: payload.email,
    full_name: payload.fullName,
    role: payload.role
  });

  if (profileError) return NextResponse.json({ error: profileError.message }, { status: 400 });
  await writeAuditLog({
    userId: session.user.id,
    action: "admin_user_create",
    entityType: "profile",
    entityId: data.user.id,
    metadata: { email: payload.email, role: payload.role }
  });

  return NextResponse.json({ id: data.user.id, email: payload.email, role: payload.role });
}
