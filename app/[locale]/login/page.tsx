import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { demoAuthCookieName, isValidDemoLogin } from "@/lib/demo-auth";
import { getMessages, isLocale } from "@/lib/i18n";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { RasdLogo } from "@/components/logo";
import { writeAuditLog } from "@/lib/audit";
import { Bell, LockKeyhole, RadioTower, ShieldCheck, Sparkles } from "lucide-react";

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
    <main className="login-grid grid min-h-screen place-items-center bg-navy px-4 py-8">
      <div className="w-full max-w-5xl">
        <div className="mb-6 flex justify-center">
          <div className="rounded-md border border-line bg-white p-3 shadow-sm shadow-slate-200">
            <RasdLogo label={t.brand} />
          </div>
        </div>
        <div className="grid overflow-hidden rounded-md border border-line bg-white shadow-2xl shadow-slate-200/80 lg:grid-cols-[1fr_420px]">
          <div className="hidden border-e border-line bg-navy p-8 lg:block">
            <div className="grid h-full content-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-electric/30 bg-electric/10 px-3 py-1 text-sm font-medium text-verified">
                  <ShieldCheck className="h-4 w-4" aria-hidden />
                  {t.headerStatus}
                </div>
                <h1 className="mt-6 max-w-md text-4xl font-semibold leading-tight text-slate-950">{t.login}</h1>
                <p className="mt-3 max-w-md text-sm leading-6 text-slate-600">{t.sourceBasedMonitoring}</p>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: t.breakingNews, icon: RadioTower },
                  { label: t.alerts, icon: Bell },
                  { label: t.newsroomTool, icon: Sparkles }
                ].map((item) => (
                  <div key={item.label} className="group rounded-md border border-line bg-white p-4 text-center shadow-sm transition hover:-translate-y-1 hover:border-electric hover:shadow-md">
                    <span className="interactive-icon mx-auto grid h-10 w-10 place-items-center rounded-md bg-electric/10 text-electric group-hover:bg-electric group-hover:text-white">
                      <item.icon className="h-5 w-5" aria-hidden />
                    </span>
                    <span className="mt-3 block text-xs font-medium text-slate-600">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <form action={signIn} className="p-6 sm:p-8">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-md bg-electric/10 text-electric">
              <LockKeyhole className="h-6 w-6" aria-hidden />
            </div>
            <h2 className="mt-5 text-2xl font-semibold text-slate-950">{t.login}</h2>
            <label className="mt-6 block text-sm font-medium text-slate-700">
              {t.email}
              <input name="email" type="text" required className="focus-ring mt-2 w-full rounded-md border border-line bg-white px-3 py-3 text-slate-950 shadow-sm outline-none transition hover:border-electric/60" />
            </label>
            <label className="mt-4 block text-sm font-medium text-slate-700">
              {t.password}
              <input name="password" type="password" required className="focus-ring mt-2 w-full rounded-md border border-line bg-white px-3 py-3 text-slate-950 shadow-sm outline-none transition hover:border-electric/60" />
            </label>
            <button className="focus-ring mt-6 w-full rounded-md bg-electric px-4 py-3 font-semibold text-white shadow-lg shadow-electric/25 transition hover:-translate-y-0.5 hover:bg-verified">
              {t.signIn}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
