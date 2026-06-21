"use client";

import Link from "next/link";
import { Bell, FileText, Gauge, ListChecks, Newspaper, RadioTower, Settings, Users } from "lucide-react";
import { useEffect, useState } from "react";

const iconMap = {
  gauge: Gauge,
  radio: RadioTower,
  newspaper: Newspaper,
  file: FileText,
  bell: Bell,
  users: Users,
  settings: Settings,
  list: ListChecks
};

type NavItem = {
  href: string;
  label: string;
  icon: keyof typeof iconMap;
};

export function DashboardNav({
  items,
  currentPath,
  initialRecentAlert
}: {
  items: NavItem[];
  currentPath: string;
  initialRecentAlert: boolean;
}) {
  const [hasRecentAlert, setHasRecentAlert] = useState(initialRecentAlert);

  useEffect(() => {
    let alive = true;
    async function poll() {
      try {
        const response = await fetch("/api/alerts/recent", { cache: "no-store" });
        if (!response.ok) return;
        const data = (await response.json()) as { hasRecentTelegramAlert?: boolean };
        if (alive) setHasRecentAlert(Boolean(data.hasRecentTelegramAlert));
      } catch {
        // Keep the previous visual state if the poll fails.
      }
    }
    const timer = window.setInterval(poll, 15_000);
    void poll();
    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, []);

  return (
    <nav className="mt-6 space-y-1">
      {items.map((item) => {
        const active = item.href.endsWith("/dashboard") ? currentPath === item.href : currentPath.startsWith(item.href);
        const Icon = iconMap[item.icon];
        const alertGlow = item.icon === "bell" && hasRecentAlert;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={[
              "group relative flex items-center gap-3 border-s border-transparent px-4 py-3 text-sm transition",
              active ? "border-electric bg-[#2f363d] text-white" : "text-white/90 hover:bg-[#46515c] hover:text-white"
            ].join(" ")}
          >
            <span
              className={[
                "interactive-icon grid h-8 w-8 place-items-center rounded-sm",
                active ? "bg-electric text-white" : "bg-white/10 text-white group-hover:bg-electric",
                alertGlow ? "alert-pulse bg-urgent text-white" : ""
              ].join(" ")}
            >
              <Icon className="h-4 w-4" aria-hidden />
            </span>
            <span className="truncate font-medium">{item.label}</span>
            {alertGlow ? <span className="ms-auto h-2.5 w-2.5 rounded-full bg-urgent" aria-label="تنبيه جديد" /> : null}
          </Link>
        );
      })}
    </nav>
  );
}
