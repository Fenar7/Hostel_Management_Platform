import { LucideIcon, ArrowUpRight, ArrowDownRight } from "lucide-react";
import Image from "next/image";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle: string;
  icon?: LucideIcon;
  iconUrl?: string;
  trend: string;
  trendUp?: boolean;
}

export function StatCard({ title, value, subtitle, icon: Icon, iconUrl, trend, trendUp }: StatCardProps) {
  return (
    <div className="premium-card flex flex-col justify-between p-6 gap-6 relative overflow-hidden">
      {/* Top row: title + icon */}
      <div className="flex justify-between items-start relative z-10">
        <h3 className="text-[13px] font-semibold text-[#767676] dark:text-[#a0a0a0] uppercase tracking-wider leading-snug">{title}</h3>
        <div className="size-8 flex items-center justify-center shrink-0">
          {iconUrl ? (
            <Image src={iconUrl} alt={title} width={24} height={24} className="size-6 object-contain opacity-70 dark:opacity-50" />
          ) : Icon ? (
            <Icon className="size-6 text-[#58ff48]" />
          ) : null}
        </div>
      </div>

      {/* Bottom row: value + trend */}
      <div className="flex justify-between items-end relative z-10">
        <div>
          <div className="text-[40px] font-bold text-black dark:text-white leading-none tracking-tight">{value}</div>
          <div className="text-[13px] text-[#767676] mt-2 font-medium">{subtitle}</div>
        </div>
        <div className="text-[13px] text-black dark:text-white font-medium flex flex-col items-end gap-1">
          {trendUp !== undefined && (
            trendUp
              ? <ArrowUpRight className="size-5 text-[#58ff48]" />
              : <ArrowDownRight className="size-5 text-red-500" />
          )}
          <span>{trend}</span>
        </div>
      </div>
      
      {/* Subtle background glow for dark mode */}
      <div className="absolute -top-10 -right-10 w-32 h-32 bg-[#58ff48] opacity-0 dark:opacity-[0.03] blur-3xl rounded-full pointer-events-none z-0"></div>
    </div>
  );
}
