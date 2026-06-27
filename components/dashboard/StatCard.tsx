import { LucideIcon, ArrowUpRight, ArrowDownRight } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle: string;
  icon: LucideIcon;
  trend: string;
  trendUp?: boolean;
}

export function StatCard({ title, value, subtitle, icon: Icon, trend, trendUp }: StatCardProps) {
  return (
    <div className="h-[191px] rounded-[7px] border border-[#dedede] relative bg-white dark:bg-zinc-900 flex flex-col justify-between p-5">
      <div className="flex justify-between items-start">
        <h3 className="text-[19px] font-semibold text-black dark:text-white">{title}</h3>
        <div className="size-[49px] rounded-[7px] bg-[#5c5c5c] flex items-center justify-center">
          <Icon className="size-6 text-[#58ff48]" />
        </div>
      </div>
      
      <div className="flex justify-between items-end">
        <div>
          <div className="text-[30px] font-bold text-black dark:text-white leading-tight">{value}</div>
          <div className="text-[17px] text-[#767676]">{subtitle}</div>
        </div>
        <div className="text-[17px] text-[#767676] flex flex-col items-end gap-1">
          {trendUp !== undefined && (
            trendUp ? <ArrowUpRight className="size-5 text-black dark:text-white" /> : <ArrowDownRight className="size-5 text-black dark:text-white" />
          )}
          <span>{trend}</span>
        </div>
      </div>
    </div>
  );
}
