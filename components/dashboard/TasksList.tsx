import { Checkbox } from "@/components/ui/checkbox";

interface Task {
  id: string;
  title: string;
  completed: boolean;
  tag?: string;
}

const tasks: Task[] = [
  { id: "1", title: "Verify pending KYC documents", completed: false, tag: "Today" },
  { id: "2", title: "Follow up on overdue rent", completed: true, tag: "Yesterday" },
  { id: "3", title: "Approve visitor requests", completed: false, tag: "Today" },
  { id: "4", title: "Schedule maintenance for Room 102", completed: false },
];

export function TasksList() {
  return (
    <div className="p-6 rounded-3xl border border-[var(--stroke-grey)] bg-white dark:bg-zinc-900 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-[var(--carbon-black)] dark:text-white">Tasks</h3>
        <button className="text-sm font-bold text-blue-600 hover:text-blue-700">Add Task</button>
      </div>
      <div className="flex flex-col gap-4">
        {tasks.map((task) => (
          <label key={task.id} className="flex items-start gap-3 p-3 rounded-2xl hover:bg-[var(--light-white)] dark:hover:bg-zinc-800 transition-colors cursor-pointer border border-transparent hover:border-[var(--stroke-grey)]">
            <Checkbox checked={task.completed} className="mt-0.5 rounded-[6px]" />
            <div className="flex-1">
              <p className={`text-sm font-semibold ${task.completed ? 'line-through text-muted-foreground' : 'text-[var(--carbon-black)] dark:text-white'}`}>
                {task.title}
              </p>
              {task.tag && (
                <span className="text-[10px] font-bold uppercase tracking-wide text-[var(--hash-grey-2)] mt-1 inline-block">
                  {task.tag}
                </span>
              )}
            </div>
          </label>
        ))}
      </div>
    </div>
  );
}
