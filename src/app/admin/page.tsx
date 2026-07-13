"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend, LineChart, Line } from "recharts";
import Navigation from "@/app/components/Navigation";
import { LedgerRowSkeleton, StatBlockSkeleton, Skeleton } from "@/app/components/Skeleton";
import ConfirmDialog from "@/app/components/ConfirmDialog";
import { toast } from "sonner";
import { FileSearch, SlidersHorizontal, Download, Printer, Star } from "lucide-react";

// ─── Interfaces ─────────────────────────────────────────────────────────────
interface Profile {
  full_name: string;
}

interface ComplaintStatusHistory {
  id: string;
  status: string;
  note: string | null;
  created_at: string;
}

interface Complaint {
  id: string;
  category: string;
  priority: string;
  description: string;
  status: string;
  photo_url: string | null;
  created_at: string;
  apartment_no: string;
  resident_id: string;
  profiles: Profile | Profile[] | null;
  complaint_status_history: ComplaintStatusHistory[];
  rating: number | null;
  rating_comment: string | null;
}
// SLA: flag complaints open for more than 3 days as overdue
function isOverdue(comp: Complaint) {
  if (comp.status.toLowerCase() === "resolved") return false;
  const diffDays = Math.floor(
    (Date.now() - new Date(comp.created_at).getTime()) / (1000 * 60 * 60 * 24)
  );
  return diffDays > 3;
}

// ─── Helper Functions ────────────────────────────────────────────────────────
function getStampClass(status: string) {
  switch (status.toLowerCase()) {
    case "open": return "status-stamp status-stamp--open";
    case "in_progress":
    case "in progress": return "status-stamp status-stamp--progress";
    case "resolved": return "status-stamp status-stamp--resolved";
    default: return "status-stamp status-stamp--open";
  }
}

function fmtStatus(status: string) {
  return status.replace(/_/g, " ").toUpperCase();
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function getResidentName(comp: Complaint): string {
  if (!comp.profiles) return "Unknown Resident";
  if (Array.isArray(comp.profiles)) {
    return comp.profiles[0]?.full_name || "Unknown Resident";
  }
  return comp.profiles.full_name || "Unknown Resident";
}

// ─── Main Admin Dashboard Component ──────────────────────────────────────────
export default function AdminDashboard() {
  const router = useRouter();

  // User session
  const [currentUser, setCurrentUser] = useState<{ name: string; role: string } | null>(null);

  // Complaints States
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [mounted, setMounted] = useState(false);

  // Filtering states
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [catFilter, setCatFilter] = useState<string>("ALL");
  const [searchUnit, setSearchUnit] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  // Dialog State
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [newPriority, setNewPriority] = useState<string>("Medium");
  const [newStatus, setNewStatus] = useState<string>("open");
  const [note, setNote] = useState<string>("");
  const [saving, setSaving] = useState(false);

  // Resolution Confirm dialog
  const [showConfirmResolve, setShowConfirmResolve] = useState(false);

  // Tab navigation
  const [activeTab, setActiveTab] = useState<"analytics" | "ledger">("analytics");

  const dialogRef = useRef<HTMLDivElement>(null);

  // Fetch complaints from Supabase
  const fetchComplaints = async () => {
    try {
      const supabase = createClient();
      const { data: comps, error } = await supabase
        .from("complaints")
        .select(`
          id,
          category,
          priority,
          description,
          status,
          photo_url,
          created_at,
          apartment_no,
          resident_id,
          rating,
          rating_comment,
          profiles:resident_id ( full_name ),
          complaint_status_history (
            id,
            status,
            note,
            created_at
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setComplaints((comps as Complaint[]) ?? []);
    } catch (err) {
      console.error("Failed to load complaints from DB", err);
    }
  };

  // Load User details, complaints and notices
  useEffect(() => {
    const fetchAdminSession = async () => {
      const supabase = createClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        router.push("/login");
        return;
      }

      // Fetch user profile from profiles table
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      const name = profile?.full_name || user.user_metadata?.full_name || "SUPERINTENDENT";
      const role = profile?.role || "admin";

      if (role !== "admin") {
        router.push("/dashboard");
        return;
      }

      setCurrentUser({ name, role });

      // Load DB complaints
      await fetchComplaints();
      setLoadingData(false);
      setMounted(true);
    };

    fetchAdminSession();
  }, [router]);

  // Save priority/status changes to Supabase
  const executeSaveChanges = async () => {
    if (!selectedComplaint) return;
    setSaving(true);

    try {
      const res = await fetch("/api/admin/update-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          complaintId: selectedComplaint.id,
          newStatus,
          newPriority,
          note: note.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "FAILED TO SAVE CHANGES.");
      }

      // Refresh master list
      await fetchComplaints();
      toast.success("ENTRY MAINTENANCE UPDATE RECORDED");

      // Reset & Close
      setSelectedComplaint(null);
      setNote("");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "FAILED TO SAVE CHANGES.";
      toast.error(`ERROR: ${msg.toUpperCase()}`);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveChangesClick = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedComplaint) return;
    
    // Check if status is set to resolved
    if (newStatus.toLowerCase() === "resolved") {
      setShowConfirmResolve(true);
    } else {
      executeSaveChanges();
    }
  };

  // Open dialog config
  const openEditDialog = (comp: Complaint) => {
    setSelectedComplaint(comp);
    setNewPriority(comp.priority);
    // Normalize DB status value to match <option> values in the dropdown
    const rawStatus = comp.status.toLowerCase();
    const normalizedStatus =
      rawStatus === "in progress" || rawStatus === "in_progress"
        ? "progress"
        : rawStatus; // "open" | "resolved" stay as-is
    setNewStatus(normalizedStatus);
    setNote("");
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center font-utility text-xs text-[var(--ink-muted)]">
        LOADING ADMINISTRATIVE CONTEXT...
      </div>
    );
  }

  // Count aggregates based on current complaints list
  const totalComplaintsCount = complaints.length;
  const openCount = complaints.filter((c) => c.status.toLowerCase() === "open").length;
  const progressCount = complaints.filter((c) => ["progress", "in_progress", "in progress"].includes(c.status.toLowerCase())).length;
  const resolvedCount = complaints.filter((c) => c.status.toLowerCase() === "resolved").length;
  const overdueCount = complaints.filter(isOverdue).length;
  const resolutionRate = totalComplaintsCount > 0
    ? Math.round((resolvedCount / totalComplaintsCount) * 100)
    : 0;

  // Weekly complaint trend — last 8 weeks
  const weeklyTrendData = (() => {
    const data: { week: string; Filed: number; Resolved: number }[] = [];
    for (let i = 7; i >= 0; i--) {
      const weekStart = new Date();
      weekStart.setHours(0, 0, 0, 0);
      weekStart.setDate(weekStart.getDate() - i * 7);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);
      const label = weekStart.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
      const filed = complaints.filter(c => {
        const d = new Date(c.created_at);
        return d >= weekStart && d < weekEnd;
      }).length;
      const resolved = complaints.filter(c => {
        const d = new Date(c.created_at);
        return d >= weekStart && d < weekEnd && c.status.toLowerCase() === "resolved";
      }).length;
      data.push({ week: label, Filed: filed, Resolved: resolved });
    }
    return data;
  })();

  // Export filtered complaints to CSV
  const exportToCSV = () => {
    const headers = ["Ref ID", "Unit", "Resident", "Category", "Priority", "Status", "SLA Tier", "Rating", "Filed Date", "Description"];
    const rows = filteredComplaints.map(c => {
      const overdue = isOverdue(c);
      return [
        c.id,
        c.apartment_no,
        getResidentName(c),
        c.category,
        c.priority,
        c.status,
        overdue ? "OVERDUE" : "ON TIME",
        c.rating ? `${c.rating}/5` : "—",
        new Date(c.created_at).toLocaleDateString("en-IN"),
        `"${c.description.replace(/"/g, '""')}"`,
      ];
    });
    const csv = [headers, ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `society-fix-${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const categoriesList = ["Plumbing", "Electrical", "Cleaning", "Security", "Parking", "Other"];
  
  // Custom stacked bar segments
  const categoryChartData = categoriesList.map((cat) => {
    const catComps = complaints.filter((c) => c.category === cat);
    return {
      category: cat.toUpperCase(),
      OPEN: catComps.filter((c) => c.status.toLowerCase() === "open").length,
      PROGRESS: catComps.filter((c) => ["progress", "in_progress", "in progress"].includes(c.status.toLowerCase())).length,
      RESOLVED: catComps.filter((c) => c.status.toLowerCase() === "resolved").length,
    };
  });

  // Filter list
  const filteredComplaints = complaints.filter((c) => {
    if (catFilter !== "ALL" && c.category !== catFilter) return false;

    if (statusFilter !== "ALL") {
      const matchLower = statusFilter.toLowerCase();
      if (matchLower === "progress") {
        if (!["progress", "in_progress", "in progress"].includes(c.status.toLowerCase())) return false;
      } else if (c.status.toLowerCase() !== matchLower) {
        return false;
      }
    }

    if (searchUnit.trim() !== "") {
      const cleanedSearch = searchUnit.toLowerCase();
      const matchUnit = c.apartment_no.toLowerCase().includes(cleanedSearch);
      const matchName = getResidentName(c).toLowerCase().includes(cleanedSearch);
      const matchDesc = c.description.toLowerCase().includes(cleanedSearch);
      if (!matchUnit && !matchName && !matchDesc) return false;
    }

    if (startDate) {
      const start = new Date(startDate).setHours(0, 0, 0, 0);
      const created = new Date(c.created_at).getTime();
      if (created < start) return false;
    }
    if (endDate) {
      const end = new Date(endDate).setHours(23, 59, 59, 999);
      const created = new Date(c.created_at).getTime();
      if (created > end) return false;
    }

    return true;
  });

  // Overdue and Date Sort: Overdue items sorted to top. Secondary sort is created_at descending.
  const sortedComplaints = [...filteredComplaints].sort((a, b) => {
    const aOverdue = isOverdue(a);
    const bOverdue = isOverdue(b);

    if (aOverdue && !bOverdue) return -1;
    if (!aOverdue && bOverdue) return 1;

    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  return (
    <>
      <Navigation />
      {/* Dialog overlay and backdrop */}
      {selectedComplaint && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={(e) => {
            if (dialogRef.current && !dialogRef.current.contains(e.target as Node)) {
              setSelectedComplaint(null);
            }
          }}
        >
          <div
            ref={dialogRef}
            className="ledger-board bg-[var(--surface)] w-full max-w-2xl max-h-[90vh] flex flex-col rounded-[6px]"
          >
            {/* Dialog Header */}
            <div className="bg-[var(--surface-2)] border-b border-[var(--border)] text-[var(--ink)] px-5 py-4 flex justify-between items-start flex-shrink-0">
              <div>
                <span className="utility-caps text-[10px] text-[var(--ink-muted)] font-semibold tracking-wider">
                  ENTRY MAINTENANCE SHEET
                </span>
                <h3 className="text-lg font-bold font-display uppercase mt-1">
                  COMPLAINT REF: {selectedComplaint.id}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedComplaint(null)}
                className="font-utility text-xs text-[var(--ink-muted)] hover:text-[var(--ink)] mt-1"
              >
                [ESC]
              </button>
            </div>

            {/* Dialog Body (Scrollable) */}
            <div className="p-5 overflow-y-auto flex-1 grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column: Complaint Details */}
              <div className="flex flex-col gap-4">
                <div>
                  <span className="utility-caps text-[10px] block text-[var(--ink-muted)] mb-1">RESIDENT</span>
                  <div className="font-body text-sm font-semibold text-[var(--ink)]">
                    {getResidentName(selectedComplaint)} (UNIT: {selectedComplaint.apartment_no})
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="utility-caps text-[10px] block text-[var(--ink-muted)] mb-1">CATEGORY</span>
                    <span className="font-utility text-xs font-bold uppercase text-[var(--ink)]">
                      {selectedComplaint.category}
                    </span>
                  </div>
                  <div>
                    <span className="utility-caps text-[10px] block text-[var(--ink-muted)] mb-1">DATE FILED</span>
                    <span className="font-utility text-xs text-[var(--ink)]">
                      {fmtDate(selectedComplaint.created_at)}
                    </span>
                  </div>
                </div>

                <div>
                  <span className="utility-caps text-[10px] block text-[var(--ink-muted)] mb-1">DEFECT REPORT</span>
                  <p className="font-body text-xs text-[var(--ink)] leading-relaxed bg-[var(--surface-2)] p-3 border border-[var(--border)] rounded-[6px] whitespace-pre-wrap">
                    {selectedComplaint.description}
                  </p>
                </div>

                {selectedComplaint.photo_url && (
                  <div>
                    <span className="utility-caps text-[10px] block text-[var(--ink-muted)] mb-1">EVIDENCE PHOTO</span>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={selectedComplaint.photo_url}
                      alt="Complaint Evidence"
                      className="w-full h-32 object-cover border border-[var(--border)] rounded-[6px] cursor-pointer"
                      onClick={() => window.open(selectedComplaint.photo_url!, "_blank")}
                    />
                  </div>
                )}

                {/* History Timeline */}
                <div>
                  <span className="utility-caps text-[10px] block text-[var(--ink-muted)] mb-2">STATUS TIMELINE</span>
                  <div className="border-l border-[var(--border)] pl-4 ml-1.5 space-y-3 max-h-[150px] overflow-y-auto">
                    {selectedComplaint.complaint_status_history?.length === 0 ? (
                      <div className="font-utility text-[10px] text-[var(--ink-muted)] opacity-60">NO PREVIOUS HISTORY ENTRIES.</div>
                    ) : (
                      [...(selectedComplaint.complaint_status_history ?? [])]
                        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
                        .map((h) => (
                          <div key={h.id} className="relative">
                            <span className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full border border-[var(--surface)] bg-[var(--border)]" />
                            <div className="text-[10px] font-utility font-bold uppercase text-[var(--ink)]">
                              {fmtStatus(h.status)}
                            </div>
                            {h.note && (
                              <p className="text-[10px] font-body text-[var(--ink-muted)] italic mt-0.5">
                                &quot;{h.note}&quot;
                              </p>
                            )}
                            <p className="text-[9px] font-utility text-[var(--ink-muted)] opacity-60">
                              {fmtDateTime(h.created_at)}
                            </p>
                          </div>
                        ))
                    )}
                  </div>
                </div>

                {/* Resident Rating (if present) */}
                {selectedComplaint.rating && (
                  <div className="border-t border-[var(--border)] pt-4">
                    <span className="utility-caps text-[10px] block text-[var(--ink-muted)] mb-2">RESIDENT SATISFACTION RATING</span>
                    <div className="flex items-center gap-1 mb-1.5">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          className={`w-4 h-4 ${
                            s <= selectedComplaint.rating!
                              ? "fill-[var(--accent)] text-[var(--accent)]"
                              : "text-[var(--border)]"
                          }`}
                        />
                      ))}
                      <span className="font-utility text-[10px] text-[var(--ink-muted)] ml-2">
                        {selectedComplaint.rating}/5
                      </span>
                    </div>
                    {selectedComplaint.rating_comment && (
                      <p className="font-body text-xs text-[var(--ink-muted)] italic leading-relaxed">
                        &quot;{selectedComplaint.rating_comment}&quot;
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Right Column: Update Form */}
              <div className="flex flex-col justify-between border-t md:border-t-0 md:border-l border-[var(--border)] pt-5 md:pt-0 md:pl-6">
                <form onSubmit={handleSaveChangesClick} className="flex flex-col gap-4">
                  <h4 className="font-display font-bold text-xs uppercase tracking-wide border-b border-[var(--border)] pb-2 mb-1 text-[var(--ink)]">
                    MAINTENANCE CONTROLS
                  </h4>

                  {/* Priority select */}
                  <div>
                    <label htmlFor="edit-priority" className="utility-caps text-[10px] block mb-2 text-[var(--ink)] opacity-75">
                      Priority Tier
                    </label>
                    <select
                      id="edit-priority"
                      className="select-minimal"
                      disabled={selectedComplaint.status.toLowerCase() === "resolved"}
                      value={newPriority}
                      onChange={(e) => setNewPriority(e.target.value)}
                    >
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                    </select>
                  </div>

                  {/* Status select */}
                  <div>
                    <label htmlFor="edit-status" className="utility-caps text-[10px] block mb-2 text-[var(--ink)] opacity-75">
                      Status State
                    </label>
                    <select
                      id="edit-status"
                      className="select-minimal"
                      disabled={selectedComplaint.status.toLowerCase() === "resolved"}
                      value={newStatus}
                      onChange={(e) => setNewStatus(e.target.value)}
                    >
                      <option value="open">OPEN</option>
                      <option value="progress">IN PROGRESS</option>
                      <option value="resolved">RESOLVED</option>
                    </select>
                  </div>

                  {/* Note block */}
                  <div>
                    <label htmlFor="edit-note" className="utility-caps text-[10px] block mb-2 text-[var(--ink)] opacity-75">
                      Status Note / Action Taken
                    </label>
                    <textarea
                      id="edit-note"
                      rows={3}
                      className="input-minimal resize-none text-xs"
                      disabled={selectedComplaint.status.toLowerCase() === "resolved"}
                      placeholder="ENTER PROGRESS LOG DETAILS..."
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                    />
                  </div>

                  {selectedComplaint.status.toLowerCase() === "resolved" ? (
                    <div className="border border-[var(--status-resolved)] text-[var(--status-resolved)] p-3 font-utility text-[10px] bg-[var(--status-resolved)]/10 rounded-[6px] text-center leading-relaxed">
                      ★ TICKET CLOSED ★<br />RESOLVED ENTRIES ARE ARCHIVED AND READ-ONLY.
                    </div>
                  ) : (
                    <button
                      type="submit"
                      disabled={saving}
                      className="btn-minimal btn-minimal-accent w-full mt-2 disabled:opacity-50 rounded-[6px]"
                    >
                      {saving ? "COMMITTING..." : "COMMIT UPDATE"}
                    </button>
                  )}
                </form>

                <button
                  type="button"
                  onClick={() => setSelectedComplaint(null)}
                  className="btn-minimal-secondary w-full text-xs py-2 mt-4 rounded-[6px]"
                >
                  CANCEL
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog Resolve */}
      <ConfirmDialog
        isOpen={showConfirmResolve}
        title="Mark as Resolved?"
        description="Are you sure you want to resolve this complaint? Marked entries are archived and cannot be edited in the maintenance sheets thereafter."
        onConfirm={() => {
          setShowConfirmResolve(false);
          executeSaveChanges();
        }}
        onCancel={() => setShowConfirmResolve(false)}
      />

      <main className="min-h-[calc(100vh-64px)] py-12 px-4 md:px-6 max-w-[1280px] mx-auto flex flex-col gap-12">
        {/* Top Header */}
        <header className="border-b border-[var(--border)] pb-6 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <span className="utility-caps text-[var(--ink-muted)] font-semibold tracking-widest text-xs">
              ADMINISTRATOR BOARD REGISTER
            </span>
            <h1 className="text-3xl font-bold tracking-tight text-[var(--ink)] mt-1">
              SUPERINTENDENT JOURNAL
            </h1>
          </div>
        </header>

        {/* Section Tab Navigation */}
        <nav className="flex items-center border-b border-[var(--border)] gap-0 flex-shrink-0">
          {([
            { id: "analytics", label: "ANALYTICS & OVERVIEW" },
            { id: "ledger",    label: "COMPLAINTS LEDGER" },
          ] as const).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`relative font-utility text-[11px] font-bold tracking-widest px-5 py-3 transition-colors ${
                activeTab === tab.id
                  ? "text-[var(--ink)]"
                  : "text-[var(--ink-muted)] hover:text-[var(--ink)]"
              }`}
            >
              {tab.label}
              {activeTab === tab.id && (
                <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[var(--accent)] rounded-t-full" />
              )}
            </button>
          ))}
        </nav>

        {loadingData ? (
          <>
            {/* Stat skeletons */}
            <section className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {[1, 2, 3, 4, 5].map((idx) => (
                <StatBlockSkeleton key={idx} />
              ))}
            </section>
            
            {/* Table skeleton */}
            <section className="flex flex-col gap-4">
              <Skeleton className="h-6 w-1/4" />
              <div className="ledger-board p-4 flex flex-col gap-4">
                {[1, 2, 3, 4].map((idx) => (
                  <LedgerRowSkeleton key={idx} />
                ))}
              </div>
            </section>
          </>
        ) : (
          <>
            {/* ── ANALYTICS TAB ─────────────────────────────────── */}
            {activeTab === "analytics" && (<>
            {/* Ledger Stat blocks */}
            <section className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
              <div className="ledger-tab">
                <span className="utility-caps text-[10px] text-[var(--ink-muted)]">TOTAL REGISTERED</span>
                <div className="font-utility font-bold text-3xl mt-1 text-[var(--ink)]">
                  {String(totalComplaintsCount).padStart(2, "0")}
                </div>
              </div>
              
              <div className="ledger-tab ledger-tab--open">
                <span className="utility-caps text-[10px] text-[var(--status-open)] font-bold">OPEN ENTRIES</span>
                <div className="font-utility font-bold text-3xl mt-1 text-[var(--status-open)]">
                  {String(openCount).padStart(2, "0")}
                </div>
              </div>
              
              <div className="ledger-tab ledger-tab--progress">
                <span className="utility-caps text-[10px] text-[var(--status-progress)] font-bold">IN PROGRESS</span>
                <div className="font-utility font-bold text-3xl mt-1 text-[var(--status-progress)]">
                  {String(progressCount).padStart(2, "0")}
                </div>
              </div>
              
              <div className="ledger-tab ledger-tab--resolved">
                <span className="utility-caps text-[10px] text-[var(--status-resolved)] font-bold">RESOLVED</span>
                <div className="font-utility font-bold text-3xl mt-1 text-[var(--status-resolved)]">
                  {String(resolvedCount).padStart(2, "0")}
                </div>
              </div>

              <div className="ledger-tab border-[var(--status-open)] border-t-4">
                <span className="utility-caps text-[10px] text-[var(--status-open)] font-bold animate-pulse">★ OVERDUE</span>
                <div className="font-utility font-bold text-3xl mt-1 text-[var(--status-open)]">
                  {String(overdueCount).padStart(2, "0")}
                </div>
              </div>

              <div className="ledger-tab ledger-tab--accent">
                <span className="utility-caps text-[10px] text-[var(--accent)] font-bold">RESOLUTION RATE</span>
                <div className="font-utility font-bold text-3xl mt-1 text-[var(--accent)]">
                  {resolutionRate}%
                </div>
                <div className="font-utility text-[9px] text-[var(--ink-muted)] mt-0.5">
                  {resolvedCount}/{totalComplaintsCount} CLOSED
                </div>
              </div>
            </section>

            {/* Category Distribution Chart */}
            <section className="ledger-board p-6 bg-[var(--surface)]">
              <h2 className="text-xs font-bold font-display border-b border-[var(--border)] pb-3 mb-6 uppercase text-[var(--ink)] tracking-wider">
                DEPARTMENTAL COMPLAINT DISTRIBUTION
              </h2>
              <div className="w-full h-64">
                {mounted ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={categoryChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="category" stroke="var(--ink-muted)" fontSize={9} tickLine={false} />
                      <YAxis stroke="var(--ink-muted)" fontSize={9} tickLine={false} allowDecimals={false} />
                      <Tooltip
                        contentStyle={{
                          background: "var(--surface)",
                          border: "1px solid var(--border)",
                          fontSize: "10px",
                          fontFamily: "var(--font-body)",
                          color: "var(--ink)",
                          borderRadius: "6px"
                        }}
                      />
                      <Legend
                        wrapperStyle={{ fontSize: "10px", fontFamily: "var(--font-utility)", paddingTop: "12px" }}
                        formatter={(value) => <span style={{ color: "var(--ink-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{value}</span>}
                      />
                      <Bar dataKey="OPEN" stackId="status-stack" fill="var(--status-open)" barSize={30} />
                      <Bar dataKey="PROGRESS" stackId="status-stack" fill="var(--status-progress)" barSize={30} />
                      <Bar dataKey="RESOLVED" stackId="status-stack" fill="var(--status-resolved)" barSize={30} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="w-full h-full flex items-center justify-center font-utility text-xs text-[var(--ink-muted)]">
                    PREPARING DATA MODEL GRAPH...
                  </div>
                )}
              </div>
            </section>

            {/* Weekly Complaint Trend Chart */}
            <section className="ledger-board p-6 bg-[var(--surface)]">
              <h2 className="text-xs font-bold font-display border-b border-[var(--border)] pb-3 mb-6 uppercase text-[var(--ink)] tracking-wider">
                WEEKLY FILING TREND — LAST 8 WEEKS
              </h2>
              <div className="w-full h-52">
                {mounted ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={weeklyTrendData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="week" stroke="var(--ink-muted)" fontSize={9} tickLine={false} />
                      <YAxis stroke="var(--ink-muted)" fontSize={9} tickLine={false} allowDecimals={false} />
                      <Tooltip
                        contentStyle={{
                          background: "var(--surface)",
                          border: "1px solid var(--border)",
                          fontSize: "10px",
                          fontFamily: "var(--font-body)",
                          color: "var(--ink)",
                          borderRadius: "6px"
                        }}
                      />
                      <Legend
                        wrapperStyle={{ fontSize: "10px", fontFamily: "var(--font-utility)", paddingTop: "12px" }}
                        formatter={(value) => <span style={{ color: "var(--ink-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{value}</span>}
                      />
                      <Line type="monotone" dataKey="Filed" stroke="var(--accent)" strokeWidth={2} dot={{ r: 3, fill: "var(--accent)" }} activeDot={{ r: 5 }} />
                      <Line type="monotone" dataKey="Resolved" stroke="var(--status-resolved)" strokeWidth={2} dot={{ r: 3, fill: "var(--status-resolved)" }} activeDot={{ r: 5 }} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="w-full h-full flex items-center justify-center font-utility text-xs text-[var(--ink-muted)]">
                    PREPARING TREND MODEL...
                  </div>
                )}
              </div>
            </section>
            </>)}

            {/* ── LEDGER TAB ────────────────────────────────────── */}
            {activeTab === "ledger" && (<>
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start h-[calc(100vh-220px)]">
              {/* left column: filters */}
              <section className="flex flex-col gap-6 lg:col-span-1 sticky top-6 self-start">
                <div className="ledger-board p-5 bg-[var(--surface)]">
                  <h2 className="text-sm font-bold border-b border-[var(--border)] pb-2 mb-4 uppercase text-[var(--ink)] tracking-wider flex items-center gap-2">
                    <SlidersHorizontal size={14} className="text-[var(--accent)]" />
                    FILTERS
                  </h2>
                  
                  <div className="flex flex-col gap-4">
                    <div>
                      <label htmlFor="filter-status" className="utility-caps text-[10px] block mb-2 text-[var(--ink-muted)]">
                        Status State
                      </label>
                      <select
                        id="filter-status"
                        className="select-minimal"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                      >
                        <option value="ALL">ALL STATUSES</option>
                        <option value="OPEN">OPEN ONLY</option>
                        <option value="PROGRESS">IN PROGRESS</option>
                        <option value="RESOLVED">RESOLVED ONLY</option>
                      </select>
                    </div>

                    <div>
                      <label htmlFor="filter-cat" className="utility-caps text-[10px] block mb-2 text-[var(--ink-muted)]">
                        Category
                      </label>
                      <select
                        id="filter-cat"
                        className="select-minimal"
                        value={catFilter}
                        onChange={(e) => setCatFilter(e.target.value)}
                      >
                        <option value="ALL">ALL CATEGORIES</option>
                        <option value="Plumbing">PLUMBING</option>
                        <option value="Electrical">ELECTRICAL</option>
                        <option value="Cleaning">CLEANING</option>
                        <option value="Security">SECURITY</option>
                        <option value="Parking">PARKING</option>
                        <option value="Other">OTHER</option>
                      </select>
                    </div>

                    <div>
                      <label htmlFor="filter-search" className="utility-caps text-[10px] block mb-2 text-[var(--ink-muted)]">
                        Search Unit / Name / Description
                      </label>
                      <input
                        id="filter-search"
                        type="text"
                        className="input-minimal font-utility"
                        placeholder="Unit, name, or keyword..."
                        value={searchUnit}
                        onChange={(e) => setSearchUnit(e.target.value)}
                      />
                    </div>

                    <div className="border-t border-dashed border-[var(--border)] my-1"></div>

                    {/* Date range filter */}
                    <div>
                      <label htmlFor="filter-start-date" className="utility-caps text-[10px] block mb-2 text-[var(--ink-muted)]">
                        Date From
                      </label>
                      <input
                        id="filter-start-date"
                        type="date"
                        className="input-minimal font-utility text-xs"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                      />
                    </div>
                    <div>
                      <label htmlFor="filter-end-date" className="utility-caps text-[10px] block mb-2 text-[var(--ink-muted)]">
                        Date To
                      </label>
                      <input
                        id="filter-end-date"
                        type="date"
                        className="input-minimal font-utility text-xs"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                      />
                    </div>

                    <div className="border-t border-dashed border-[var(--border)] my-1" />

                    {/* Export Actions */}
                    <div>
                      <span className="utility-caps text-[10px] block mb-2 text-[var(--ink-muted)]">Export Data</span>
                      <div className="flex flex-col gap-2">
                        <button
                          id="export-csv-btn"
                          type="button"
                          onClick={exportToCSV}
                          className="btn-minimal-secondary flex items-center justify-center gap-2 text-xs py-2 rounded-[6px]"
                        >
                          <Download size={12} />
                          EXPORT CSV
                        </button>
                        <button
                          id="print-pdf-btn"
                          type="button"
                          onClick={() => window.print()}
                          className="btn-minimal-secondary flex items-center justify-center gap-2 text-xs py-2 rounded-[6px]"
                        >
                          <Printer size={12} />
                          PRINT / PDF
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* right column: complaints ledger table */}
              <section className="lg:col-span-3 flex flex-col gap-4 overflow-y-auto h-full pr-1">
                <h2 className="text-xl font-bold font-display uppercase text-[var(--ink)]">
                  COMPLAINTS MASTER LEDGER
                </h2>

                <div className="ledger-board">
                  {/* Header - Hidden on mobile */}
                  <div className="hidden md:grid ledger-header border-b border-[var(--border)]">
                    <span>UNIT</span>
                    <span>ENTRY DETAILS & RESIDENT</span>
                    <span>DATE</span>
                    <span>STATUS STAMP</span>
                  </div>

                  {/* List */}
                  {sortedComplaints.length === 0 ? (
                    <div className="p-8 text-center bg-[var(--surface)] flex flex-col items-center gap-4">
                      <FileSearch className="w-10 h-10 text-[var(--ink-muted)] opacity-50" />
                      <div>
                        <p className="font-utility text-xs text-[var(--ink)] uppercase tracking-wider font-semibold">
                          NO MATCHING ENTRIES
                        </p>
                        <p className="font-body text-xs text-[var(--ink-muted)] mt-1">
                          Try modifying your status or category filters, date ranges, or search keywords.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="divide-y divide-[var(--border)] bg-[var(--surface)]">
                      {sortedComplaints.map((comp) => {
                        const isCompOverdue = isOverdue(comp);
                        return (
                          <div
                            key={comp.id}
                            onClick={() => openEditDialog(comp)}
                            className="flex flex-col md:grid md:grid-template-columns md:grid-cols-[100px_1fr_140px_140px] gap-4 md:gap-0 p-5 md:py-4 md:px-5 items-start md:items-center hover:bg-[var(--surface-2)] transition-colors cursor-pointer"
                          >
                            {/* Mobile row: Unit and Status together */}
                            <div className="flex justify-between items-center w-full md:w-auto md:block">
                              <div className="ledger-unit font-utility font-bold text-sm">
                                {comp.apartment_no}
                              </div>
                              <div className="md:hidden status-stamp-container">
                                <span className={getStampClass(comp.status)}>
                                  {fmtStatus(comp.status)}
                                </span>
                              </div>
                            </div>
                            
                            {/* Description & Category details */}
                            <div className="pr-4 py-1">
                              <div className="flex gap-2 items-center mb-1 flex-wrap">
                                <span className="font-utility text-[10px] font-semibold text-[var(--ink-muted)] tracking-wider">
                                  {comp.category.toUpperCase()}
                                </span>
                                <span className={`font-utility text-[9px] font-semibold tracking-wider px-1 border rounded-[4px] ${
                                  comp.priority === "High" 
                                    ? "border-[var(--status-open)] text-[var(--status-open)]" 
                                    : comp.priority === "Medium" 
                                    ? "border-[var(--ink-muted)] text-[var(--ink-muted)]" 
                                    : "border-[var(--border)] text-[var(--ink-muted)]"
                                }`}>
                                  {comp.priority.toUpperCase()}
                                </span>
                                {isCompOverdue && (
                                  <span className="font-utility text-[9px] font-bold tracking-wider px-1.5 py-0.5 bg-[var(--status-open)] text-white rounded-[4px] animate-pulse">
                                    OVERDUE
                                  </span>
                                )}
                                <span className="font-utility text-[10px] text-[var(--ink-muted)] opacity-60">
                                  REF: {comp.id.substring(0, 8)}
                                </span>
                              </div>
                              
                              {/* Resident Name */}
                              <div className="text-[10px] font-utility font-semibold text-[var(--ink-muted)] mb-1">
                                BY: {getResidentName(comp)}
                              </div>
                              <p className="font-body text-xs text-[var(--ink)] font-medium leading-relaxed line-clamp-2 md:line-clamp-1">
                                {comp.description}
                              </p>
                            </div>

                            {/* Date */}
                            <div className="font-utility text-xs text-[var(--ink-muted)] flex items-center">
                              <span className="md:hidden mr-1">FILED: </span>
                              {fmtDate(comp.created_at)}
                            </div>

                            {/* Status Stamp - Desktop only */}
                            <div className="hidden md:flex status-stamp-container">
                              <span className={getStampClass(comp.status)}>
                                {fmtStatus(comp.status)}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </section>
            </div>
            </>)}
          </>
        )}

        {/* Footer copyright */}
        <footer className="border-t border-[var(--border)] pt-8 text-center text-xs font-utility text-[var(--ink-muted)]">
          <p>© 2026 SOCIETY-FIX. DEPUTY SUPERINTENDENT OFFICE SECURED ARCHIVES.</p>
        </footer>
      </main>
    </>
  );
}
