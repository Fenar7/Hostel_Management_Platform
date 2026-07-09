import { getTasksWidgetData } from "@/services/tasks/task.service";
import { TasksListClient } from "./TasksListClient";
import { formatRelativeTime } from "@/lib/dates";
import { PriorityBadge } from "@/components/tasks/TaskBadge";
import { CheckCircle2 } from "lucide-react";

export async function TasksList({ organizationId }: { organizationId?: string }) {
  if (!organizationId) return null;

  const rawTasks = await getTasksWidgetData({ scope: "admin", organizationId });

  // Group tasks by day using getDay() (1 = Monday, etc. matching the previous dummy design)
  // Actually, instead of strict day buckets, let's just show a flat list sorted by deadline
  // Or keep the grouped style. The plan says "Shows upcoming 8 tasks grouped by day" or similar.
  // We will list them chronologically and render a day indicator for each.
  
  if (rawTasks.length === 0) {
    return (
      <TasksListClient>
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <CheckCircle2 className="w-10 h-10 text-gray-300 dark:text-gray-600 mb-3" />
          <h4 className="text-[15px] font-bold text-gray-900 dark:text-white">All clear!</h4>
          <p className="text-[13px] text-gray-500 mt-1">No upcoming tasks for the next 7 days.</p>
        </div>
      </TasksListClient>
    );
  }

  return (
    <TasksListClient>
      {rawTasks.map((task, i) => {
        const d = new Date(task.deadline);
        const dayNum = d.getDate();
        const dayLabel = d.toLocaleDateString("en-US", { weekday: "short" });
        
        return (
          <div key={task.id} className="flex items-start gap-4 py-3.5 first:pt-0 last:pb-0 min-w-0">
            <div className="flex-1 flex flex-col gap-1 min-w-0">
              <div className="flex items-center gap-2">
                <PriorityBadge priority={task.priority} />
                <span className="text-[12px] font-bold text-gray-400 uppercase tracking-wider truncate max-w-[120px]">
                  {task.hostel.name}
                </span>
              </div>
              <h4 className="text-[14px] font-bold text-gray-900 dark:text-white leading-snug truncate">
                {task.title}
              </h4>
              <p className="text-[12px] font-medium text-gray-500 leading-snug truncate">
                {task.assignedToWarden.user.email || task.assignedToWarden.user.phone}
              </p>
              <p className={`text-[12px] font-bold leading-snug mt-0.5 ${task.isOverdue ? 'text-red-500' : 'text-gray-400'}`}>
                {task.isOverdue ? 'OVERDUE' : formatRelativeTime(task.deadline.toISOString())}
              </p>
            </div>
            
            {/* Day badge (only on desktop/tablet for visual pop) */}
            <div className="hidden sm:flex flex-col items-center gap-0.5 shrink-0 w-10">
              <div
                className={`size-6 rounded-md flex items-center justify-center text-[12px] font-bold ${
                  task.isOverdue
                    ? "bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400"
                    : i === 0 
                      ? "bg-[#282828] text-white dark:bg-white dark:text-black"
                      : "bg-[#f5f5f5] dark:bg-white/5 text-[#767676]"
                }`}
              >
                {dayNum}
              </div>
              <span
                className={`text-[11px] font-bold uppercase tracking-wider ${
                  task.isOverdue 
                    ? "text-red-500"
                    : i === 0 ? "text-gray-900 dark:text-white" : "text-[#767676]"
                }`}
              >
                {dayLabel}
              </span>
            </div>
          </div>
        );
      })}
    </TasksListClient>
  );
}
