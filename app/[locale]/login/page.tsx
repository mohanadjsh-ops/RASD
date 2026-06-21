import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { KeyRound, UserRound } from "lucide-react";
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
    <main className="login-grid grid min-h-screen place-items-center px-4 py-10">
      <form action={signIn} className="w-full max-w-[438px] overflow-hidden bg-white shadow-2xl shadow-black/20">
        <div className="grid place-items-center border-b border-slate-200 px-8 py-7">
          <RasdLogo label={t.brand} />
        </div>
        <div className="px-12 py-7">
          <h1 className="text-center text-sm font-semibold uppercase tracking-normal text-slate-900">{t.login}</h1>
          <label className="mt-7 flex h-11 items-center bg-[#e7f0fb]">
            <span className="grid h-11 w-12 place-items-center bg-navy text-white">
              <UserRound className="h-4 w-4" aria-hidden />
            </span>
            <input name="email" type="text" required className="h-full flex-1 bg-transparent px-3 text-sm text-slate-950 outline-none" placeholder={t.email} />
          </label>
          <label className="mt-5 flex h-11 items-center bg-[#e7f0fb]">
            <span className="grid h-11 w-12 place-items-center bg-navy text-white">
              <KeyRound className="h-4 w-4" aria-hidden />
            </span>
            <input name="password" type="password" required className="h-full flex-1 bg-transparent px-3 text-sm text-slate-950 outline-none" placeholder={t.password} />
          </label>
          <label className="mt-5 flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" name="remember" className="h-4 w-4 rounded border-slate-300 text-electric focus:ring-electric" />
            {t.keepSignedIn}
          </label>
          <button className="mt-6 w-full bg-urgent px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-700">
            {t.signIn}
          </button>
        </div>
      </form>
    </main>
  );
}
