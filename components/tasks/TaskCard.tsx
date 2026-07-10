import { TaskDTO } from "@/types/tasks";
import { TaskStatus } from "@/lib/constants/tasks";
import { PriorityBadge, StatusBadge } from "./TaskBadge";
import { formatRelativeTime } from "@/lib/dates";

export function TaskCard({ task, onClick }: { task: TaskDTO; onClick: () => void }) {
  const isOverdue = task.status !== TaskStatus.COMPLETED && task.status !== TaskStatus.CANCELLED && new Date(task.deadline) < new Date();
  
  return (
    <div 
      onClick={onClick}
      className={`group flex flex-col sm:flex-row sm:items-start gap-3 p-4 bg-white dark:bg-[#111111] border rounded-[8px] cursor-pointer hover:bg-[#f9f9f9] dark:hover:bg-white/5 transition-colors ${
        isOverdue ? 'border-red-200/60 dark:border-red-900/30' : 'border-[#e5e5e5] dark:border-white/10'
      }`}
    >
      <div className="flex-1 min-w-0 flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <h4 className={`text-[15px] font-medium truncate ${isOverdue ? 'text-red-600 dark:text-red-400' : 'text-[#111111] dark:text-[#eeeeee]'}`}>
            {task.title}
          </h4>
          <PriorityBadge priority={task.priority} />
          <StatusBadge status={task.status} isOverdue={isOverdue} />
        </div>
        
        {task.description && (
          <p className="text-[13.5px] text-[#707070] truncate max-w-full">
            {task.description}
          </p>
        )}
        
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 mt-1 text-[13px] text-[#707070]">
          <div className="flex items-center gap-1.5">
            <span>Hostel:</span>
            <span className="font-medium text-[#111111] dark:text-[#eeeeee] truncate max-w-[150px]">{task.hostel.name}</span>
          </div>
          <div className="w-[3px] h-[3px] rounded-full bg-[#d4d4d4]" />
          <div className="flex items-center gap-1.5">
            <span>Assignee:</span>
            <span className="font-medium text-[#111111] dark:text-[#eeeeee] truncate max-w-[150px]">{task.assignedToWarden.user.email || task.assignedToWarden.user.phone}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-start shrink-0 min-w-[100px] gap-1 pt-2 sm:pt-0">
        <div className="text-[12px] font-medium text-[#707070]">
          {isOverdue ? 'Overdue by' : 'Due'}
        </div>
        <div className={`text-[13.5px] font-medium text-right leading-tight ${isOverdue ? 'text-red-600 dark:text-red-400' : 'text-[#111111] dark:text-[#eeeeee]'}`}>
          {formatRelativeTime(task.deadline)}
          <div className="text-[12px] text-[#707070] mt-0.5 font-normal">
            {new Date(task.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          </div>
        </div>
      </div>
    </div>
  );
}
