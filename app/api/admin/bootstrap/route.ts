import { NextResponse } from "next/server";
import { serverEnv } from "@/lib/env";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

const adminEmail = "mohannadaljashi@gmail.com";
const adminPassword = "123";

export async function POST(request: Request) {
  if (!serverEnv.CRON_SECRET || request.headers.get("x-cron-secret") !== serverEnv.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createSupabaseServiceClient();
  const { data: existing, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) return NextResponse.json({ error: listError.message }, { status: 400 });

  let user = existing.users.find((item) => item.email?.toLowerCase() === adminEmail);
  if (!user) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
      user_metadata: { full_name: "Mohannad Aljashi" }
    });
    if (error || !data.user) return NextResponse.json({ error: error?.message ?? "Admin creation failed" }, { status: 400 });
    user = data.user;
  }

  await supabase.from("profiles").upsert({
    id: user.id,
    email: adminEmail,
    full_name: "Mohannad Aljashi",
    role: "admin"
  });

  return NextResponse.json({ id: user.id, email: adminEmail, role: "admin" });
}
