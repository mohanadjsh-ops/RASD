import Link from "next/link";
import { headers } from "next/headers";
import { LogOut, ShieldCheck } from "lucide-react";
import type { Locale } from "@/types/app";
import { getMessages } from "@/lib/i18n";
import { LanguageSwitcher } from "@/components/language-switcher";
import { RasdLogo } from "@/components/logo";
import { DashboardNav } from "@/components/dashboard-nav";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";

export async function DashboardShell({ children, locale }: { children: React.ReactNode; locale: Locale }) {
  const t = await getMessages(locale);
  const headerList = await headers();
  const currentPath = headerList.get("x-current-path") ?? `/${locale}/dashboard`;
  const session = await getCurrentUser();
  const supabase = await createSupabaseServerClient();
  const alertSince = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const { data: recentAlert } = await supabase
    .from("alerts")
    .select("id")
    .eq("channel_type", "telegram")
    .eq("status", "sent")
    .gte("created_at", alertSince)
    .limit(1);
  const items = [
    { href: `/${locale}/dashboard`, label: t.dashboard, icon: "gauge" as const },
    { href: `/${locale}/dashboard/breaking-news`, label: t.breakingNews, icon: "radio" as const },
    { href: `/${locale}/dashboard/sources`, label: t.sources, icon: "newspaper" as const },
    { href: `/${locale}/dashboard/newsroom-tool`, label: t.newsroomTool, icon: "file" as const },
    { href: `/${locale}/dashboard/alerts`, label: t.alerts, icon: "bell" as const },
    { href: `/${locale}/dashboard/users`, label: t.users, icon: "users" as const },
    { href: `/${locale}/dashboard/settings`, label: t.settings, icon: "settings" as const },
    { href: `/${locale}/dashboard/audit-log`, label: t.auditLog, icon: "list" as const }
  ];

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <aside className="fixed inset-y-0 hidden w-64 bg-sidebar shadow-xl shadow-slate-300/40 lg:block">
        <div className="flex h-[116px] items-center border-b border-black/20 bg-navy px-5">
          <RasdLogo label={t.brand} />
        </div>
        <DashboardNav items={items} currentPath={currentPath} initialRecentAlert={Boolean(recentAlert?.length)} />
      </aside>
      <div className="lg:ps-64">
        <header className="sticky top-0 z-10 flex h-[72px] items-center justify-between border-b border-black/20 bg-navy px-4 py-3 text-white shadow-sm shadow-slate-300/40 lg:px-8">
          <div className="lg:hidden">
            <RasdLogo label={t.brand} compact />
          </div>
          <div className="hidden items-center gap-2 text-sm font-medium text-white/80 lg:flex">
            <ShieldCheck className="h-4 w-4 text-electric" aria-hidden />
            {t.headerStatus}
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden items-center gap-2 border border-black/25 bg-white/10 px-3 py-2 text-sm sm:flex">
              <span>{session?.profile?.full_name ?? session?.profile?.email ?? "Rasd"}</span>
            </div>
            <LanguageSwitcher locale={locale} path={currentPath} />
            <Link href={`/${locale}/login`} className="inline-flex items-center gap-2 border border-black/25 bg-white/10 px-3 py-2 text-sm font-medium text-white transition hover:bg-white/20">
              <LogOut className="h-4 w-4" aria-hidden />
              {t.logout}
            </Link>
          </div>
        </header>
        <main className="px-4 py-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
