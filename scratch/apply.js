const fs = require('fs');

const ticketsContent = `"use client";

import { useEffect, useState } from "react";
import { 
  Plus, Ticket, Loader2, AlertCircle, CheckCircle2, 
  Clock, AlertTriangle, X, ChevronLeft, ChevronDown
} from "lucide-react";
import { useRouter } from "next/navigation";
import { notify } from "@/lib/toast";

function SoftCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={\`bg-white dark:bg-[#121212] rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(255,255,255,0.02)] border border-[#f0f0f0] dark:border-white/5 p-6 \${className}\`}>
      {children}
    </div>
  );
}

function PillButton({ children, onClick, variant = "primary", className = "", type = "button", disabled = false }: any) {
  const base = "h-14 px-8 rounded-full font-bold text-[15px] flex items-center justify-center gap-2 transition-all duration-200 w-full active:scale-[0.98]";
  const variants = {
    primary: "bg-[#111111] dark:bg-[#58ff48] text-white dark:text-black hover:bg-black/90",
    secondary: "bg-[#f5f5f5] dark:bg-white/10 text-[#111111] dark:text-white hover:bg-[#eeeeee]",
    outline: "bg-transparent border-[1.5px] border-[#dedede] dark:border-white/20 text-[#111111] dark:text-white hover:border-[#111111]",
    danger: "bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-100",
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={\`\${base} \${variants[variant as keyof typeof variants]} \${disabled ? "opacity-50 cursor-not-allowed" : ""} \${className}\`}>
      {children}
    </button>
  );
}

export default function TenantTicketsPage() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("NORMAL");
  const [category, setCategory] = useState("MAINTENANCE");

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    try {
      const res = await fetch("/api/tenant/tickets");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setTickets(data);
    } catch (error) {
      notify.error("Could not load tickets");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (title.length < 5) return notify.error("Title must be at least 5 characters");
    if (description.length < 10) return notify.error("Description must be at least 10 characters");

    setSubmitting(true);
    try {
      const res = await fetch("/api/tenant/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, priority, category })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to submit ticket");
      }
      notify.success("Ticket submitted successfully");
      setIsModalOpen(false);
      setTitle("");
      setDescription("");
      fetchTickets();
    } catch (error: any) {
      notify.error(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: any = {
      OPEN: "bg-[#58ff48]/20 text-[#1a8a10] dark:text-[#58ff48]",
      IN_PROGRESS: "bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400",
      RESOLVED: "bg-[#111111] text-white dark:bg-white dark:text-black",
      CLOSED: "bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-400",
    };
    const labels: any = { OPEN: "Open", IN_PROGRESS: "In Progress", RESOLVED: "Resolved", CLOSED: "Closed" };
    return (
      <span className={\`px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-widest \${styles[status]}\`}>
        {labels[status]}
      </span>
    );
  };

  const getPriorityIcon = (priority: string) => {
    if (priority === "CRITICAL") return <AlertTriangle className="w-4 h-4 text-red-500" />;
    if (priority === "HIGH") return <AlertCircle className="w-4 h-4 text-orange-500" />;
    return <Clock className="w-4 h-4 text-gray-400" />;
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] dark:bg-[#0A0A0A] pb-32 text-[#111111] dark:text-white font-sans relative">
      
      {/* -- Top App Bar -- */}
      <header className="px-6 pt-12 pb-6 flex items-center justify-between sticky top-0 bg-[#FAFAFA]/90 dark:bg-[#0A0A0A]/90 backdrop-blur-xl z-40">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => router.back()}
            className="w-12 h-12 rounded-full bg-white dark:bg-[#1A1A1A] shadow-sm border border-gray-100 dark:border-white/5 flex items-center justify-center relative hover:scale-105 transition-transform"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <p className="text-[13px] font-semibold text-gray-500 tracking-wide uppercase">Help & Support</p>
            <h1 className="text-[20px] font-bold leading-tight">Tickets</h1>
          </div>
        </div>
      </header>

      <main className="px-6 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-gray-400" /></div>
        ) : tickets.length === 0 ? (
          <SoftCard className="text-center py-16">
            <div className="w-20 h-20 bg-[#58ff48]/10 rounded-full mx-auto flex items-center justify-center mb-6">
              <CheckCircle2 className="w-10 h-10 text-[#58ff48]" />
            </div>
            <h3 className="text-xl font-bold text-black dark:text-white mb-2">No Active Issues</h3>
            <p className="text-gray-500 mb-8 leading-relaxed max-w-xs mx-auto">
              You haven't raised any tickets yet. Everything seems to be working perfectly!
            </p>
            <PillButton onClick={() => setIsModalOpen(true)} className="w-auto mx-auto px-8">
              <Plus className="w-5 h-5" />
              Raise Ticket
            </PillButton>
          </SoftCard>
        ) : (
          <div className="space-y-4">
            {tickets.map(ticket => (
              <SoftCard key={ticket.id} className="p-0 overflow-hidden hover:scale-[1.01] transition-transform cursor-pointer">
                <div className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    {getStatusBadge(ticket.status)}
                    <span className="text-[12px] font-bold text-gray-400 uppercase tracking-wider">{ticket.category}</span>
                  </div>
                  <h3 className="text-[18px] font-bold text-black dark:text-white leading-snug mb-1">{ticket.title}</h3>
                  <p className="text-[14px] text-gray-500 font-medium line-clamp-2">{ticket.description}</p>
                </div>
                <div className="bg-gray-50 dark:bg-white/5 px-5 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-[13px] font-bold text-gray-500 capitalize" title="Priority">
                    {getPriorityIcon(ticket.priority)}
                    {ticket.priority.toLowerCase()}
                  </div>
                  <div className="text-[12px] font-bold text-gray-400">
                    {new Date(ticket.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </SoftCard>
            ))}
          </div>
        )}

      </main>

      {/* -- Fixed Bottom Navigation Bar / Action Bar -- */}
      {!loading && tickets.length > 0 && (
        <nav className="fixed bottom-0 left-0 right-0 bg-white/90 dark:bg-[#111111]/90 backdrop-blur-xl border-t border-gray-100 dark:border-white/5 z-50 pb-safe">
          <div className="max-w-md mx-auto px-6 py-4">
            <PillButton onClick={() => setIsModalOpen(true)}>
              <Plus className="w-5 h-5" />
              Raise Ticket
            </PillButton>
          </div>
        </nav>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#121212] w-full sm:max-w-md rounded-t-[32px] sm:rounded-[32px] shadow-2xl overflow-hidden animate-in slide-in-from-bottom-full sm:zoom-in-95 duration-300">
            <div className="p-6 flex justify-between items-center border-b border-gray-100 dark:border-white/5">
              <h2 className="text-xl font-bold text-black dark:text-white">Raise a Ticket</h2>
              <button onClick={() => setIsModalOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 transition-colors text-gray-500">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
              <div>
                <label className="block text-[13px] font-bold text-gray-500 dark:text-white/50 mb-1.5 ml-2">Issue Title</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Broken pipe in bathroom"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="w-full h-14 px-5 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-2xl text-[16px] font-bold text-black dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[13px] font-bold text-gray-500 dark:text-white/50 mb-1.5 ml-2">Category</label>
                  <div className="relative">
                    <select 
                      value={category}
                      onChange={e => setCategory(e.target.value)}
                      className="w-full h-14 px-5 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-2xl text-[16px] font-bold text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white transition-all appearance-none"
                    >
                      <option value="MAINTENANCE">Maintenance</option>
                      <option value="CLEANING">Cleaning</option>
                      <option value="ELECTRICAL">Electrical</option>
                      <option value="PLUMBING">Plumbing</option>
                      <option value="OTHER">Other</option>
                    </select>
                    <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-[13px] font-bold text-gray-500 dark:text-white/50 mb-1.5 ml-2">Priority</label>
                  <div className="relative">
                    <select 
                      value={priority}
                      onChange={e => setPriority(e.target.value)}
                      className="w-full h-14 px-5 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-2xl text-[16px] font-bold text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white transition-all appearance-none"
                    >
                      <option value="LOW">Low</option>
                      <option value="NORMAL">Normal</option>
                      <option value="HIGH">High</option>
                      <option value="CRITICAL">Critical</option>
                    </select>
                    <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[13px] font-bold text-gray-500 dark:text-white/50 mb-1.5 ml-2">Description</label>
                <textarea 
                  required
                  rows={4}
                  placeholder="Provide as much detail as possible..."
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="w-full p-5 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-2xl text-[16px] font-bold text-black dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white transition-all resize-none"
                />
              </div>

              <div className="pt-2 pb-4 sm:pb-0">
                <PillButton type="submit" disabled={submitting}>
                  {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Submit Ticket"}
                </PillButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}`;

fs.writeFileSync("app/tenant/tickets/page.tsx", ticketsContent);

let current = fs.readFileSync("app/tenant/page.tsx", "utf8");

const startMarker = "{/* Balance Overview */}";
const endMarker = "</div>\n            )}";

const startIdx = current.indexOf(startMarker);
const tabProfileIdx = current.indexOf("{/* TAB: PROFILE");
if(startIdx !== -1 && tabProfileIdx !== -1) {
    const textBeforeProfile = current.substring(startIdx, tabProfileIdx);
    const endOfForm = textBeforeProfile.lastIndexOf("</div>\n            )}");
    
    if(endOfForm !== -1) {
        const prefix = current.substring(0, startIdx);
        const suffix = current.substring(startIdx + endOfForm + 18);
        
        const replacement = `            {/* Balance Target Card */}
            <SoftCard className="bg-[#111111] dark:bg-white border-0 text-white dark:text-black">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <p className="text-white/60 dark:text-black/50 font-medium mb-1">Balance Due</p>
                  <h2 className="text-4xl font-black">{formatCurrency(remaining)}</h2>
                </div>
                {remaining > 0 && <span className="bg-red-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-sm">PENDING</span>}
              </div>
              
              {remaining > 0 && (
                <div className="bg-white/10 dark:bg-black/5 p-5 rounded-[20px] mt-6">
                  <h3 className="font-bold mb-4 text-[15px] flex items-center gap-2">
                    <UploadCloud className="w-5 h-5 text-[#58ff48]" />
                    Submit Payment Proof
                  </h3>
                  
                  <form onSubmit={handleUploadPayment} className="space-y-4">
                    {/* Payment Mode Toggle */}
                    <div className="flex bg-white/5 dark:bg-black/10 p-1 rounded-xl mb-4">
                      <button
                        type="button"
                        onClick={() => setPaymentMode("UPI")}
                        className={\`flex-1 py-2 text-[14px] font-bold rounded-lg transition-all \${
                          paymentMode === "UPI"
                            ? "bg-white dark:bg-black text-black dark:text-white shadow-sm"
                            : "text-white/60 dark:text-black/60 hover:text-white dark:hover:text-black"
                        }\`}
                      >
                        Online (UPI)
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentMode("CASH")}
                        className={\`flex-1 py-2 text-[14px] font-bold rounded-lg transition-all \${
                          paymentMode === "CASH"
                            ? "bg-white dark:bg-black text-black dark:text-white shadow-sm"
                            : "text-white/60 dark:text-black/60 hover:text-white dark:hover:text-black"
                        }\`}
                      >
                        Cash to Warden
                      </button>
                    </div>

                    {paymentMode === "UPI" ? (
                      /* Image Upload Area */
                      <div className="relative border-2 border-dashed border-white/20 dark:border-black/20 bg-white/5 dark:bg-black/5 hover:bg-white/10 dark:hover:bg-black/10 rounded-[20px] p-5 flex flex-col items-center justify-center text-center cursor-pointer transition-colors overflow-hidden group">
                        <input 
                          type="file" 
                          accept="image/png, image/jpeg" 
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              setUploadFile(file);
                              setPreviewUrl(URL.createObjectURL(file));
                            }
                          }}
                        />
                        {previewUrl ? (
                          <div className="relative w-full h-40 rounded-xl overflow-hidden">
                            <img src={previewUrl} className="w-full h-full object-cover" alt="Payment Proof Preview" />
                            <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <UploadCloud className="w-8 h-8 text-white mb-2" />
                              <span className="text-white font-bold text-[13px]">Change Screenshot</span>
                            </div>
                          </div>
                        ) : (
                          <div className="py-4">
                            <div className="w-12 h-12 rounded-full bg-white/10 dark:bg-black/10 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                              <ImageIcon className="w-6 h-6 text-[#58ff48] dark:text-[#1a8a10]" />
                            </div>
                            <p className="font-bold text-[14px] text-white dark:text-black">Upload Screenshot</p>
                            <p className="text-[12px] text-white/60 dark:text-black/60 mt-1">Tap to browse (JPG, PNG)</p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="bg-orange-500/10 dark:bg-orange-500/10 p-4 rounded-[16px] border border-orange-500/20 text-center">
                        <AlertCircle className="w-6 h-6 text-orange-400 dark:text-orange-600 mx-auto mb-2" />
                        <p className="text-[13px] text-orange-300 dark:text-orange-700 font-medium">
                          Please hand over the exact cash amount directly to your warden. They will verify and approve this payment manually.
                        </p>
                      </div>
                    )}

                    <div>
                      <input
                        type="number" required min="1" value={uploadAmount} onChange={e => setUploadAmount(e.target.value)}
                        className="w-full h-14 px-5 bg-white dark:bg-white rounded-full text-[16px] font-bold text-black placeholder:text-gray-400 focus:outline-none shadow-inner transition-all"
                        placeholder="Amount (?)"
                      />
                    </div>
                    
                    <PillButton 
                      type="submit" 
                      disabled={uploading || (paymentMode === "UPI" && !uploadFile)} 
                      className="bg-white dark:bg-black text-black dark:text-white mt-2 w-full"
                    >
                      {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Submit Payment Details"}
                    </PillButton>
                  </form>
                </div>
              )}
            </SoftCard>`;
            
        fs.writeFileSync("app/tenant/page.tsx", prefix + replacement + suffix);
        console.log("Updated page.tsx!");
    }
}
