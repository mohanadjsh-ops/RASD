import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { demoAuthCookieName, isValidDemoLogin } from "@/lib/demo-auth";
import { getMessages, isLocale } from "@/lib/i18n";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { RasdLogo } from "@/components/logo";
import { writeAuditLog } from "@/lib/audit";

export default async function LoginPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: localeParam } = await params;
  const locale = isLocale(localeParam) ? localeParam : "ar";
  const t = await getMessages(locale);

  async function signIn(formData: FormData) {
    "use server";
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");

    if (isValidDemoLogin(email, password)) {
      const cookieStore = await cookies();
      cookieStore.set(demoAuthCookieName, "admin", {
        httpOnly: true,
        sameSite: "lax",
        secure: false,
        path: "/",
        maxAge: 60 * 60 * 8
      });
      redirect(`/${locale}/dashboard`);
    }

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    await writeAuditLog({
      userId: data.user?.id,
      action: error ? "login_failed" : "login_success",
      entityType: "auth",
      metadata: { email }
    });
    if (!error) redirect(`/${locale}/dashboard`);
  }

  return (
    <main className="grid min-h-screen place-items-center bg-navy px-4">
      <form action={signIn} className="w-full max-w-md rounded-md border border-line bg-panel p-6 shadow-2xl">
        <RasdLogo label={t.brand} />
        <h1 className="mt-8 text-2xl font-semibold text-white">{t.login}</h1>
        <label className="mt-6 block text-sm text-slate-300">
          {t.email}
          <input name="email" type="text" required className="focus-ring mt-2 w-full rounded-md border border-line bg-navy px-3 py-3 text-white" />
        </label>
        <label className="mt-4 block text-sm text-slate-300">
          {t.password}
          <input name="password" type="password" required className="focus-ring mt-2 w-full rounded-md border border-line bg-navy px-3 py-3 text-white" />
        </label>
        <button className="focus-ring mt-6 w-full rounded-md bg-electric px-4 py-3 font-semibold text-white hover:bg-blue-500">
          {t.signIn}
        </button>
      </form>
    </main>
  );
}
