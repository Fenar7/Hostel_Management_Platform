import { CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface Activity {
  id: string;
  title: string;
  time: string;
  type: "success" | "warning" | "info";
}

const activities: Activity[] = [
  { id: "1", title: "John Doe paid rent", time: "10 mins ago", type: "success" },
  { id: "2", title: "New booking request", time: "1 hr ago", type: "info" },
  { id: "3", title: "Maintenance issue reported", time: "2 hrs ago", type: "warning" },
  { id: "4", title: "Jane Smith checked in", time: "5 hrs ago", type: "success" },
];

export function ActivityFeed() {
  return (
    <div className="p-6 rounded-3xl border border-[var(--stroke-grey)] bg-white dark:bg-zinc-900 shadow-sm">
      <h3 className="text-lg font-bold text-[var(--carbon-black)] dark:text-white mb-6">Recent Activity</h3>
      <div className="flex flex-col gap-6 relative before:absolute before:inset-y-0 before:left-[11px] before:w-[2px] before:bg-[var(--stroke-grey)] dark:before:bg-zinc-800">
        {activities.map((activity) => (
          <div key={activity.id} className="flex gap-4 relative z-10">
            <div className={cn(
              "h-6 w-6 rounded-full flex items-center justify-center shrink-0 border-2 border-white dark:border-zinc-900",
              activity.type === "success" && "bg-emerald-500",
              activity.type === "warning" && "bg-amber-500",
              activity.type === "info" && "bg-blue-500"
            )}>
              {activity.type === "success" && <CheckCircle2 className="h-3.5 w-3.5 text-white" />}
              {activity.type === "warning" && <AlertCircle className="h-3.5 w-3.5 text-white" />}
              {activity.type === "info" && <Clock className="h-3.5 w-3.5 text-white" />}
            </div>
            <div className="flex-1 -mt-1">
              <p className="font-semibold text-sm text-[var(--carbon-black)] dark:text-white">{activity.title}</p>
              <span className="text-xs text-[var(--hash-grey-2)] font-medium mt-0.5 inline-block">{activity.time}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
