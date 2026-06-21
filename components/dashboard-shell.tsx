import Link from "next/link";
import { headers } from "next/headers";
import { Bell, FileText, Gauge, ListChecks, RadioTower, Settings, ShieldCheck, Newspaper, Users } from "lucide-react";
import type { Locale } from "@/types/app";
import { getMessages } from "@/lib/i18n";
import { LanguageSwitcher } from "@/components/language-switcher";
import { RasdLogo } from "@/components/logo";

export async function DashboardShell({ children, locale }: { children: React.ReactNode; locale: Locale }) {
  const t = await getMessages(locale);
  const headerList = await headers();
  const currentPath = headerList.get("x-current-path") ?? `/${locale}/dashboard`;
  const items = [
    { href: `/${locale}/dashboard`, label: t.dashboard, icon: Gauge },
    { href: `/${locale}/dashboard/breaking-news`, label: t.breakingNews, icon: RadioTower },
    { href: `/${locale}/dashboard/sources`, label: t.sources, icon: Newspaper },
    { href: `/${locale}/dashboard/newsroom-tool`, label: t.newsroomTool, icon: FileText },
    { href: `/${locale}/dashboard/alerts`, label: t.alerts, icon: Bell },
    { href: `/${locale}/dashboard/users`, label: t.users, icon: Users },
    { href: `/${locale}/dashboard/settings`, label: t.settings, icon: Settings },
    { href: `/${locale}/dashboard/audit-log`, label: t.auditLog, icon: ListChecks }
  ];

  return (
    <div className="min-h-screen bg-navy text-slate-100">
      <aside className="fixed inset-y-0 hidden w-72 border-e border-line bg-panel/95 p-4 shadow-2xl shadow-black/25 lg:block">
        <div className="rounded-md border border-line bg-black/20 p-3">
          <RasdLogo label={t.brand} />
        </div>
        <nav className="mt-6 space-y-1">
          {items.map((item) => {
            const active = item.href === `/${locale}/dashboard` ? currentPath === item.href : currentPath.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={[
                  "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition",
                  active
                    ? "border border-electric/40 bg-electric/15 text-white shadow-sm shadow-electric/10"
                    : "text-slate-300 hover:bg-white/5 hover:text-white"
                ].join(" ")}
              >
                <item.icon className={active ? "h-4 w-4 text-electric" : "h-4 w-4 text-slate-500"} aria-hidden />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>
      <div className="lg:ps-72">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-navy/85 px-4 py-3 backdrop-blur lg:px-8">
          <div className="lg:hidden">
            <RasdLogo label={t.brand} />
          </div>
          <div className="hidden items-center gap-2 text-sm text-slate-300 lg:flex">
            <ShieldCheck className="h-4 w-4 text-electric" aria-hidden />
            {t.headerStatus}
          </div>
          <LanguageSwitcher locale={locale} path={currentPath} />
        </header>
        <main className="px-4 py-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
