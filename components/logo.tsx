import { Check, Activity } from "lucide-react";

export function RasdLogo({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="relative grid h-10 w-10 place-items-center rounded-md border border-electric/40 bg-electric/10">
        <Activity className="h-6 w-6 text-electric" aria-hidden />
        <Check className="absolute bottom-1 right-1 h-3.5 w-3.5 text-verified" aria-hidden />
      </div>
      <span className="text-xl font-semibold tracking-normal text-white">{label}</span>
    </div>
  );
}
