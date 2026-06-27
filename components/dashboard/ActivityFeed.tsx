import { AlertTriangle } from "lucide-react";

export function ActivityFeed() {
  return (
    <div className="rounded-[7px] border border-[#dedede] bg-white dark:bg-zinc-900 p-5 h-full">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-[19px] font-semibold text-black dark:text-white">Activity</h3>
        <div className="flex gap-2">
          <button className="border border-[#dedede] text-black dark:text-white rounded-[4px] px-3 py-1 text-[13px] font-medium hover:bg-gray-50 dark:hover:bg-zinc-800">
            Filter
          </button>
          <button className="bg-[#5c5c5c] text-[#58ff48] rounded-[4px] px-3 py-1 text-[13px] font-medium hover:opacity-90">
            Know More
          </button>
        </div>
      </div>
      
      <div className="flex flex-col">
        <div className="py-4 border-b border-[#dedede] flex flex-col gap-1 first:pt-0">
          <h4 className="text-[17px] font-semibold text-[#18b92b]">Jhon Doe Has Completed payment</h4>
          <p className="text-[#767676] text-[15px]">onboarding @ Jan 5 2026 to Mar 3 2026 | Floor 3 bed 22A</p>
          <p className="text-[#a1a1a1] text-[13px]">Today 3:33 PM</p>
          <div className="text-black dark:text-white text-[15px] font-medium flex items-center gap-2 mt-1">
            Report an issue <AlertTriangle className="size-4" />
          </div>
        </div>
        
        <div className="py-4 border-b border-[#dedede] flex flex-col gap-1">
          <h4 className="text-[17px] font-semibold text-[#18b92b]">Jhon Doe Has Completed payment</h4>
          <p className="text-[#767676] text-[15px]">onboarding @ Jan 5 2026 to Mar 3 2026 | Floor 3 bed 22A</p>
          <p className="text-[#a1a1a1] text-[13px]">Today 3:33 PM</p>
          <div className="text-[#e23030] text-[15px] font-medium flex items-center gap-2 mt-1">
            Reported @ 2:23 AM March 23 2025 <AlertTriangle className="size-4" />
          </div>
        </div>
        
        <div className="py-4 border-b border-[#dedede] flex flex-col gap-1">
          <h4 className="text-[17px] font-semibold text-[#e1a918]">Alan has started filling the form</h4>
          <p className="text-[#767676] text-[15px]">User registered today has started filling the form now</p>
          <p className="text-[#a1a1a1] text-[13px]">Today 3:33 PM</p>
        </div>
        
        <div className="py-4 flex flex-col gap-1 pb-0">
          <h4 className="text-[17px] font-semibold text-[#285bc7]">Sarah has submitted the details</h4>
          <p className="text-[#767676] text-[15px]">Sarah has submitted the details and is waiting for payment link</p>
          <p className="text-[#a1a1a1] text-[13px]">Today 3:33 PM</p>
        </div>
      </div>
    </div>
  );
}
