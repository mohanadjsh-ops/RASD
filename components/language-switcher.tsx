import Link from "next/link";
import type { Locale } from "@/types/app";

export function LanguageSwitcher({ locale, path }: { locale: Locale; path: string }) {
  const other = locale === "ar" ? "en" : "ar";
  const target = path.replace(`/${locale}`, `/${other}`);

  return (
    <Link className="rounded-md border border-line bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-electric hover:text-slate-950" href={target}>
      {other.toUpperCase()}
    </Link>
  );
}
