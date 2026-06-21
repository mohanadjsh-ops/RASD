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
    <div className="min-h-screen bg-navy text-slate-900">
      <aside className="fixed inset-y-0 hidden w-72 border-e border-line bg-panel/95 p-4 shadow-xl shadow-slate-200/80 lg:block">
        <div className="rounded-md border border-line bg-navy p-3">
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
                  "group relative flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition hover:-translate-y-0.5",
                  active
                    ? "border border-electric/40 bg-electric/10 text-slate-950 shadow-sm shadow-electric/10"
                    : "text-slate-600 hover:bg-navy hover:text-slate-950"
                ].join(" ")}
              >
                {active ? <span className="absolute inset-y-2 start-0 w-1 rounded-full bg-electric" /> : null}
                <span className={active ? "interactive-icon grid h-8 w-8 place-items-center rounded-md bg-electric text-white" : "interactive-icon grid h-8 w-8 place-items-center rounded-md border border-line bg-white text-slate-500 group-hover:border-electric group-hover:text-electric"}>
                  <item.icon className="h-4 w-4" aria-hidden />
                </span>
                <span className="truncate font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>
      <div className="lg:ps-72">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-white/85 px-4 py-3 shadow-sm shadow-slate-200/50 backdrop-blur lg:px-8">
          <div className="lg:hidden">
            <RasdLogo label={t.brand} />
          </div>
          <div className="hidden items-center gap-2 text-sm font-medium text-slate-600 lg:flex">
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
