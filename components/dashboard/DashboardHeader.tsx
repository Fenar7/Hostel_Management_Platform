import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function DashboardHeader() {
  const dateStr = new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).format(new Date());

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-[var(--carbon-black)] dark:text-white">Overview</h1>
        <p className="text-muted-foreground font-medium mt-1">{dateStr}</p>
      </div>
      <div className="flex items-center gap-3">
        <Button variant="outline" className="font-semibold h-11 px-6 rounded-full border-2 border-[var(--cloud-grey)] text-[var(--carbon-black)] dark:text-white">Manage Rent</Button>
        <Button className="font-semibold h-11 px-6 rounded-full bg-[var(--cta-green)] text-black hover:bg-[#4ae63a] dark:text-black">On Board a User</Button>
      </div>
    </div>
  );
}
