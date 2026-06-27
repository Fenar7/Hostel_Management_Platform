import { cn } from "@/lib/utils";

interface StatusItem {
  id: string;
  label: string;
  value: string;
  statusText?: string;
  statusColor?: "green" | "yellow" | "red" | "blue" | "default";
}

interface StatusListCardProps {
  title: string;
  items: StatusItem[];
  actionLabel?: string;
}

export function StatusListCard({ title, items, actionLabel = "View All" }: StatusListCardProps) {
  return (
    <div className="p-6 rounded-3xl border border-[var(--stroke-grey)] bg-white dark:bg-zinc-900 shadow-sm flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-[var(--carbon-black)] dark:text-white">{title}</h3>
        <button className="text-sm font-semibold text-blue-600 hover:text-blue-700">{actionLabel}</button>
      </div>
      <div className="flex flex-col gap-3">
        {items.map((item) => (
          <div key={item.id} className="flex items-center justify-between p-3 rounded-2xl hover:bg-[var(--light-white)] dark:hover:bg-zinc-800 transition-colors">
            <span className="font-semibold text-[var(--carbon-black)] dark:text-white">{item.label}</span>
            <div className="flex items-center gap-3">
              <span className="font-bold text-[var(--carbon-black)] dark:text-white">{item.value}</span>
              {item.statusText && (
                <span className={cn(
                  "text-xs font-bold px-2 py-1 rounded-md",
                  item.statusColor === "green" && "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
                  item.statusColor === "yellow" && "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
                  item.statusColor === "red" && "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
                  item.statusColor === "blue" && "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
                  (!item.statusColor || item.statusColor === "default") && "bg-gray-100 text-gray-700 dark:bg-zinc-800 dark:text-gray-300"
                )}>
                  {item.statusText}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
