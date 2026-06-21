import Image from "next/image";

export function RasdLogo({ label, compact = false }: { label: string; compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <Image
        src={compact ? "/rasd-icon.jpg" : "/rasd-logo.jpg"}
        alt={label}
        width={compact ? 48 : 220}
        height={compact ? 48 : 72}
        className={compact ? "h-10 w-10 rounded-md object-contain" : "h-12 w-auto max-w-[180px] object-contain"}
        priority
      />
      {compact ? <span className="text-xl font-semibold tracking-normal text-white">{label}</span> : null}
    </div>
  );
}
