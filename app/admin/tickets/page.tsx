"use client";

import { useEffect, useState } from "react";
import { Loader2, CheckCircle2, ChevronDown } from "lucide-react";
import { notify } from "@/lib/toast";

export default function AdminTicketsPage() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [hostels, setHostels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("ALL");
  const [hostelFilter, setHostelFilter] = useState("ALL");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    fetchHostels();
  }, []);

  useEffect(() => {
    fetchTickets();
  }, [filter, hostelFilter]);

  const fetchHostels = async () => {
    try {
      const res = await fetch("/api/admin/hostels"); // Assuming this endpoint exists, if not we fall back
      if (res.ok) {
        const data = await res.json();
        setHostels(data);
      }
    } catch (error) {
      // ignore
    }
  };

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/tickets?status=${filter}&hostelId=${hostelFilter}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setTickets(data);
    } catch (error) {
      notify.error("Could not load tickets");
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: string, newStatus: string) => {
    setUpdatingId(id);
    try {
      const res = await fetch("/api/admin/tickets", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: newStatus })
      });
      if (!res.ok) throw new Error("Failed to update status");
      
      notify.success("Status updated");
      setTickets(tickets.map(t => t.id === id ? { ...t, status: newStatus } : t));
    } catch (error) {
      notify.error("Update failed");
    } finally {
      setUpdatingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: any = {
      OPEN: "bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20",
      IN_PROGRESS: "bg-orange-50 text-orange-600 border-orange-200 dark:bg-orange-500/10 dark:text-orange-400 dark:border-orange-500/20",
      RESOLVED: "bg-green-50 text-green-600 border-green-200 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20",
      CLOSED: "bg-gray-100 text-gray-600 border-gray-300 dark:bg-white/10 dark:text-gray-400 dark:border-white/20",
    };
    return styles[status] || styles.OPEN;
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] dark:bg-[#050505] p-6 lg:p-8 font-sans">
      <div className="max-w-[1400px] mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-black tracking-tight text-black dark:text-white">Global Ticketing System</h1>
            <p className="text-sm text-gray-500 font-medium mt-1">Monitor and manage all tenant complaints across every hostel.</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-4">
            {hostels.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-gray-400 uppercase tracking-wider">Hostel:</span>
                <select 
                  value={hostelFilter}
                  onChange={e => setHostelFilter(e.target.value)}
                  className="h-10 px-4 rounded-xl bg-white dark:bg-[#111111] border border-gray-200 dark:border-white/10 font-bold text-sm outline-none appearance-none cursor-pointer max-w-[200px] truncate"
                >
                  <option value="ALL">All Hostels</option>
                  {hostels.map(h => (
                    <option key={h.id} value={h.id}>{h.name}</option>
                  ))}
                </select>
              </div>
            )}
            
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-gray-400 uppercase tracking-wider">Status:</span>
              <select 
                value={filter}
                onChange={e => setFilter(e.target.value)}
                className="h-10 px-4 rounded-xl bg-white dark:bg-[#111111] border border-gray-200 dark:border-white/10 font-bold text-sm outline-none appearance-none cursor-pointer"
              >
                <option value="ALL">All Tickets</option>
                <option value="OPEN">Open</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="RESOLVED">Resolved</option>
                <option value="CLOSED">Closed</option>
              </select>
            </div>
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-white dark:bg-[#111111] rounded-3xl border border-gray-200 dark:border-white/10 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead>
                <tr className="border-b border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/5">
                  <th className="px-6 py-4 text-[12px] font-bold text-gray-400 uppercase tracking-wider">Hostel</th>
                  <th className="px-6 py-4 text-[12px] font-bold text-gray-400 uppercase tracking-wider">Tenant</th>
                  <th className="px-6 py-4 text-[12px] font-bold text-gray-400 uppercase tracking-wider">Issue</th>
                  <th className="px-6 py-4 text-[12px] font-bold text-gray-400 uppercase tracking-wider">Priority</th>
                  <th className="px-6 py-4 text-[12px] font-bold text-gray-400 uppercase tracking-wider">Created</th>
                  <th className="px-6 py-4 text-[12px] font-bold text-gray-400 uppercase tracking-wider">Status & Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-20 text-center">
                      <Loader2 className="w-6 h-6 animate-spin text-gray-400 mx-auto" />
                    </td>
                  </tr>
                ) : tickets.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-20 text-center">
                      <CheckCircle2 className="w-8 h-8 text-green-500 mx-auto mb-3" />
                      <p className="text-gray-500 font-medium text-sm">No tickets found for this filter.</p>
                    </td>
                  </tr>
                ) : (
                  tickets.map(ticket => (
                    <tr key={ticket.id} className="hover:bg-gray-50/50 dark:hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-bold text-gray-900 dark:text-white">{ticket.hostel.name}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-bold text-gray-900 dark:text-white">{ticket.tenant.fullName}</div>
                      </td>
                      <td className="px-6 py-4 max-w-[300px]">
                        <div className="font-bold text-gray-900 dark:text-white truncate">{ticket.title}</div>
                        <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mt-1">{ticket.category}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-[12px] font-bold uppercase tracking-wider ${ticket.priority === 'CRITICAL' ? 'text-red-500' : ticket.priority === 'HIGH' ? 'text-orange-500' : 'text-gray-500'}`}>
                          {ticket.priority}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-500">
                        {new Date(ticket.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <div className="relative inline-block">
                          <select 
                            value={ticket.status}
                            onChange={(e) => updateStatus(ticket.id, e.target.value)}
                            disabled={updatingId === ticket.id}
                            className={`appearance-none px-4 py-2 pr-8 rounded-full text-[12px] font-bold uppercase tracking-wider border outline-none cursor-pointer disabled:opacity-50 transition-colors ${getStatusBadge(ticket.status)}`}
                          >
                            <option value="OPEN">Open</option>
                            <option value="IN_PROGRESS">In Progress</option>
                            <option value="RESOLVED">Resolved</option>
                            <option value="CLOSED">Closed</option>
                          </select>
                          <ChevronDown className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-50" />
                          {updatingId === ticket.id && (
                            <Loader2 className="w-3.5 h-3.5 absolute right-8 top-1/2 -translate-y-1/2 animate-spin opacity-50" />
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
