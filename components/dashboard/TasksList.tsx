export function TasksList() {
  return (
    <div className="rounded-[7px] border border-[#dedede] bg-white dark:bg-zinc-900 p-5 h-full">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-[19px] font-semibold text-black dark:text-white">Tasks</h3>
        <button className="bg-[#5c5c5c] text-[#58ff48] rounded-[4px] px-3 py-1 text-[13px] font-medium hover:opacity-90">
          View All
        </button>
      </div>
      
      <div className="flex flex-col gap-6 overflow-hidden">
        <div className="flex items-start justify-between">
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <TaskItem title="Do Grocery Purhcases" assigned="Assigned from HQ" deadline="Deadline Today 3:33 PM" />
            <TaskItem title="Onboard Ashiq" assigned="Assigned from HQ" deadline="Deadline March 3 3:33 PM" />
          </div>
          <div className="w-[60px] flex items-center justify-end gap-2 ml-4">
            <div className="size-6 rounded-full bg-[#f1f1f1] dark:bg-zinc-800 text-[#767676] flex items-center justify-center text-[13px] font-semibold">1</div>
            <span className="text-[#767676] text-[15px] font-medium w-8">Mon</span>
          </div>
        </div>
        
        <div className="flex items-start justify-between">
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <TaskItem title="Do Grocery Purhcases" assigned="Assigned from HQ" deadline="Deadline Today 3:33 PM" />
            <TaskItem title="Do Grocery Purhcases" assigned="Assigned from HQ" deadline="Deadline Today 3:33 PM" />
          </div>
          <div className="w-[60px] flex items-center justify-end gap-2 ml-4">
            <div className="size-6 rounded-full bg-[#5c5c5c] text-white flex items-center justify-center text-[13px] font-semibold">2</div>
            <span className="text-black dark:text-white font-semibold text-[15px] w-8">Tue</span>
          </div>
        </div>
        
        <div className="flex items-start justify-between">
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <TaskItem title="Do Grocery Purhcases" assigned="Assigned from HQ" deadline="Deadline Today 3:33 PM" />
            <TaskItem title="Onboard New Staff" assigned="Assigned from HQ" deadline="Deadline Today 3:33 PM" />
          </div>
          <div className="w-[60px] flex items-center justify-end gap-2 ml-4">
            <div className="size-6 rounded-full bg-[#f1f1f1] dark:bg-zinc-800 text-[#767676] flex items-center justify-center text-[13px] font-semibold">3</div>
            <span className="text-[#767676] text-[15px] font-medium w-8">Wed</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function TaskItem({ title, assigned, deadline }: { title: string, assigned: string, deadline: string }) {
  return (
    <div className="flex items-start gap-3 min-w-0">
      <div className="mt-1 size-[22px] rounded-[4px] border-2 border-[#dedede] shrink-0" />
      <div className="flex flex-col min-w-0">
        <h4 className="text-[16px] font-semibold text-black dark:text-white leading-tight mb-1 truncate">{title}</h4>
        <p className="text-[#a1a1a1] text-[13px] leading-tight mb-0.5 truncate">{assigned}</p>
        <p className="text-[#a1a1a1] text-[13px] leading-tight truncate">{deadline}</p>
      </div>
    </div>
  );
}
