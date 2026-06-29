const DAYS = [
  { num: 1, label: "Mon" },
  { num: 2, label: "Tue" },
  { num: 3, label: "Wed" },
  { num: 4, label: "Thu" },
];

const TASKS: Record<number, { title: string; assigned: string; deadline: string }[]> = {
  1: [
    { title: "Do Grocery Purchases", assigned: "Assigned from HQ", deadline: "Deadline Today 3:33 PM" },
    { title: "Onboard Ashiq", assigned: "Assigned from HQ", deadline: "Deadline March 3 3:33 PM" },
  ],
  2: [
    { title: "Do Grocery Purchases", assigned: "Assigned from HQ", deadline: "Deadline Today 3:33 PM" },
    { title: "Do Grocery Purchases", assigned: "Assigned from HQ", deadline: "Deadline Today 3:33 PM" },
  ],
  3: [
    { title: "Do Grocery Purchases", assigned: "Assigned from HQ", deadline: "Deadline Today 3:33 PM" },
    { title: "Onboard New Staff", assigned: "Assigned from HQ", deadline: "Deadline Today 3:33 PM" },
  ],
  4: [
    { title: "Do Grocery Purchases", assigned: "Assigned from HQ", deadline: "Deadline Today 3:33 PM" },
    { title: "Check Inventory", assigned: "Assigned from HQ", deadline: "Deadline Today 3:33 PM" },
  ],
};

export function TasksList() {
  return (
    <div className="premium-card p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-[14px] font-bold text-black dark:text-white uppercase tracking-wider">Tasks</h3>
        <button className="text-[12px] font-semibold text-[#767676] hover:text-[#58ff48] transition-colors uppercase tracking-wider flex items-center gap-1">
          View All <span className="text-[14px]">→</span>
        </button>
      </div>

      <div className="flex flex-col divide-y divide-[#dedede] dark:divide-white/10">
        {DAYS.map((day, dayIdx) => (
          <div key={day.num} className="flex items-start gap-4 py-4 first:pt-0 last:pb-0">
            {/* Tasks column */}
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 min-w-0">
              {(TASKS[day.num] ?? []).map((task, i) => (
                <TaskItem key={i} {...task} />
              ))}
            </div>
            {/* Day badge */}
            <div className="flex flex-col items-center gap-1 shrink-0 w-10">
              <div
                className={`size-6 rounded-sm flex items-center justify-center text-[12px] font-bold ${
                  dayIdx === 1
                    ? "bg-[#58ff48] text-black"
                    : "bg-[#f5f5f5] dark:bg-white/5 text-[#767676]"
                }`}
              >
                {day.num}
              </div>
              <span
                className={`text-[11px] uppercase tracking-wider font-bold ${
                  dayIdx === 1 ? "text-black dark:text-white" : "text-[#767676]"
                }`}
              >
                {day.label}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

import { CheckSquare } from "lucide-react";

function TaskItem({
  title,
  assigned,
  deadline,
}: {
  title: string;
  assigned: string;
  deadline: string;
}) {
  return (
    <div className="flex items-start gap-3 min-w-0 group cursor-pointer">
      <CheckSquare className="size-4 text-[#dedede] dark:text-white/20 mt-0.5 shrink-0 group-hover:text-[#58ff48] transition-colors" />
      <div className="flex flex-col min-w-0">
        <h4 className="text-[13px] font-bold text-black dark:text-white leading-snug tracking-tight truncate group-hover:text-[#58ff48] transition-colors">{title}</h4>
        <p className="text-[12px] font-medium text-[#767676] leading-snug mt-0.5">{assigned}</p>
        <p className="text-[11px] font-bold text-[#a1a1a1] leading-snug mt-1 uppercase tracking-wider">{deadline}</p>
      </div>
    </div>
  );
}
