import type { LucideIcon } from "lucide-react";

export function MetricCard({
  label,
  value,
  detail,
  icon: Icon,
}: {
  label: string;
  value: string;
  detail: string;
  icon: LucideIcon;
}) {
  return (
    <section className="rounded-md border border-black/10 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-[#706d62]">{label}</p>
          <p className="mt-2 text-3xl font-semibold tracking-normal">{value}</p>
        </div>
        <span className="flex size-10 items-center justify-center rounded-md bg-[#e2f26b] text-black">
          <Icon size={19} />
        </span>
      </div>
      <p className="mt-5 text-sm text-[#706d62]">{detail}</p>
    </section>
  );
}
