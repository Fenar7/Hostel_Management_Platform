import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface StatusItem {
  id: string;
  label: string;
  value: string | number;
  icon?: LucideIcon;
  iconColor?: string;
}

interface StatusListCardProps {
  title: string;
  items: StatusItem[];
}

export function StatusListCard({ title, items }: StatusListCardProps) {
  return (
    <div className="rounded-[7px] border border-[#dedede] bg-white dark:bg-zinc-900 p-5">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-[19px] font-semibold text-black dark:text-white">{title}</h3>
        <button className="bg-[#5c5c5c] text-[#58ff48] rounded-[4px] px-3 py-1 text-[13px] font-medium hover:opacity-90 transition-opacity">
          Know More
        </button>
      </div>
      <div className="flex flex-col space-y-4">
        {items.map((item, idx) => {
          const Icon = item.icon;
          return (
            <div key={item.id || idx} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {Icon && <Icon className={cn("size-5", item.iconColor)} />}
                <span className="text-[17px] text-[#767676]">{item.label}</span>
              </div>
              <span className="text-[17px] font-medium text-black dark:text-white">{item.value}</span>
            </div>
          )
        })}
      </div>
    </div>
  );
}
