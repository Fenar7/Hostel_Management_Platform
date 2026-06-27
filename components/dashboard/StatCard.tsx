import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  trendUp?: boolean;
}

export function StatCard({ title, value, icon: Icon, trend, trendUp }: StatCardProps) {
  return (
    <div className="p-6 rounded-3xl border border-[var(--stroke-grey)] bg-white dark:bg-zinc-900 shadow-sm flex flex-col gap-4 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div className="h-12 w-12 rounded-2xl bg-[var(--light-white)] dark:bg-zinc-800 flex items-center justify-center">
          <Icon className="h-6 w-6 text-[var(--carbon-black)] dark:text-white" />
        </div>
        {trend && (
          <span className={cn(
            "text-sm font-semibold px-2.5 py-1 rounded-full",
            trendUp ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
          )}>
            {trend}
          </span>
        )}
      </div>
      <div>
        <p className="text-[var(--hash-grey-2)] text-sm font-medium mb-1">{title}</p>
        <h3 className="text-3xl font-bold text-[var(--carbon-black)] dark:text-white">{value}</h3>
      </div>
    </div>
  );
}
