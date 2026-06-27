import { Bell, Plus } from "lucide-react";

export function DashboardHeader() {
  const dateStr = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(new Date());
  
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-6">
      <div>
        <h1 className="text-[30px] font-extrabold tracking-tight text-black dark:text-white flex items-center gap-2">
          Dashboard <span className="text-[26px]">👋</span>
        </h1>
        <p className="text-[#767676] text-[17px] font-medium mt-1">{dateStr}</p>
      </div>
      <div className="flex items-center gap-3">
        <button className="flex items-center justify-center size-[44px] border border-[#dedede] rounded-[6px] hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors">
          <Bell className="size-5 text-[#5c5c5c] dark:text-[#a1a1a1]" />
        </button>
        <button className="flex items-center justify-center h-[44px] px-[18px] border border-[#dedede] rounded-[6px] bg-white dark:bg-zinc-900 text-black dark:text-white text-[18px] font-semibold hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors">
          Manage Rent <Plus className="ml-2 size-5 text-[#58ff48]" />
        </button>
        <button className="flex items-center justify-center h-[44px] px-[18px] border border-transparent rounded-[6px] bg-[#282828] text-white text-[18px] font-semibold hover:bg-black transition-colors">
          On Board a User <Plus className="ml-2 size-5 text-[#58ff48]" />
        </button>
      </div>
    </div>
  );
}
