import type { VerificationStatus } from "@/types/app";

const styles: Record<VerificationStatus, string> = {
  unverified: "border-slate-600 text-slate-300",
  monitoring: "border-electric/50 text-electric",
  likely: "border-yellow-500/50 text-yellow-300",
  confirmed: "border-verified/50 text-verified",
  high_confidence: "border-verified bg-verified/10 text-verified"
};

export function StatusBadge({ status }: { status: VerificationStatus }) {
  return <span className={`rounded-md border px-2 py-1 text-xs font-medium ${styles[status]}`}>{status}</span>;
}
