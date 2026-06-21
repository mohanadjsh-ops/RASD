import Link from "next/link";
import type { Locale } from "@/types/app";

export function LanguageSwitcher({ locale, path }: { locale: Locale; path: string }) {
  const other = locale === "ar" ? "en" : "ar";
  const target = path.replace(`/${locale}`, `/${other}`);

  return (
    <Link className="rounded-md border border-line px-3 py-2 text-sm text-slate-200 hover:border-electric" href={target}>
      {other.toUpperCase()}
    </Link>
  );
}
