import type { Locale, VerificationStatus } from "@/types/app";

const styles: Record<VerificationStatus, string> = {
  unverified: "border-slate-300 bg-slate-50 text-slate-600",
  monitoring: "border-electric/50 bg-electric/10 text-electric",
  likely: "border-yellow-500/50 bg-yellow-500/10 text-yellow-700",
  confirmed: "border-verified/50 bg-verified/10 text-verified",
  high_confidence: "border-verified bg-verified/15 text-verified"
};

const labels: Record<Locale, Record<VerificationStatus, string>> = {
  ar: {
    unverified: "غير موثق",
    monitoring: "قيد الرصد",
    likely: "مرجح",
    confirmed: "مؤكد",
    high_confidence: "ثقة عالية"
  },
  en: {
    unverified: "Unverified",
    monitoring: "Monitoring",
    likely: "Likely",
    confirmed: "Confirmed",
    high_confidence: "High confidence"
  }
};

export function StatusBadge({ status, locale = "en" }: { status: VerificationStatus; locale?: Locale }) {
  return <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${styles[status]}`}>{labels[locale][status]}</span>;
}
