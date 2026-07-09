"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";

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
}
const OVERDUE_THRESHOLD_DAYS = 3;

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

function isOverdue(comp: Complaint) {
  if (comp.status.toLowerCase() === "resolved") return false;
  const createdDate = new Date(comp.created_at);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - createdDate.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays > OVERDUE_THRESHOLD_DAYS;
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
  const [saveError, setSaveError] = useState("");

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

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  // Save priority/status changes to Supabase
  const handleSaveChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedComplaint) return;
    setSaving(true);
    setSaveError("");

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

      // Reset & Close
      setSelectedComplaint(null);
      setNote("");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "FAILED TO SAVE CHANGES.";
      setSaveError(msg);
    } finally {
      setSaving(false);
    }
  };


  // Open dialog config
  const openEditDialog = (comp: Complaint) => {
    setSelectedComplaint(comp);
    setNewPriority(comp.priority);
    setNewStatus(comp.status);
    setNote("");
    setSaveError("");
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center font-utility text-xs">
        LOADING ADMINISTRATIVE CONTEXT...
      </div>
    );
  }

  // Count aggregates based on current complaints list
  const totalComplaintsCount = complaints.length;
  const openCount = complaints.filter((c) => c.status.toLowerCase() === "open").length;
  const progressCount = complaints.filter((c) => ["progress", "in_progress"].includes(c.status.toLowerCase())).length;
  const resolvedCount = complaints.filter((c) => c.status.toLowerCase() === "resolved").length;
  const overdueCount = complaints.filter(isOverdue).length;

  const categoriesList = ["Plumbing", "Electrical", "Cleaning", "Security", "Parking", "Other"];
  const categoryChartData = categoriesList.map((cat) => ({
    category: cat.toUpperCase(),
    Complaints: complaints.filter((c) => c.category === cat).length,
  }));

  // Filter list
  const filteredComplaints = complaints.filter((c) => {
    // Category Filter
    if (catFilter !== "ALL" && c.category !== catFilter) return false;

    // Status Filter
    if (statusFilter !== "ALL") {
      const matchLower = statusFilter.toLowerCase();
      if (matchLower === "progress") {
        if (!["progress", "in_progress"].includes(c.status.toLowerCase())) return false;
      } else if (c.status.toLowerCase() !== matchLower) {
        return false;
      }
    }

    // Unit Search Filter
    if (searchUnit.trim() !== "") {
      const cleanedSearch = searchUnit.toLowerCase();
      const matchUnit = c.apartment_no.toLowerCase().includes(cleanedSearch);
      const matchName = getResidentName(c).toLowerCase().includes(cleanedSearch);
      if (!matchUnit && !matchName) return false;
    }

    // Date Range Filter
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
      {/* Dialog overlay and backdrop */}
      {selectedComplaint && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
          onClick={(e) => {
            if (dialogRef.current && !dialogRef.current.contains(e.target as Node)) {
              setSelectedComplaint(null);
            }
          }}
        >
          <div
            ref={dialogRef}
            className="ledger-board bg-[var(--surface)] w-full max-w-2xl max-h-[90vh] flex flex-col"
          >
            {/* Dialog Header */}
            <div className="bg-[var(--ink)] text-[var(--bg)] px-5 py-4 flex justify-between items-start flex-shrink-0">
              <div>
                <span className="utility-caps text-[10px] text-[var(--accent)] font-semibold tracking-wider">
                  ENTRY MAINTENANCE SHEET
                </span>
                <h3 className="text-lg font-bold font-display uppercase">
                  COMPLAINT REF: {selectedComplaint.id}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedComplaint(null)}
                className="font-utility text-xs text-[var(--bg)] opacity-60 hover:opacity-100 mt-1"
              >
                [ESC]
              </button>
            </div>

            {/* Dialog Body (Scrollable) */}
            <div className="p-5 overflow-y-auto flex-1 grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Left Column: Complaint Details */}
              <div className="flex flex-col gap-4">
                <div>
                  <span className="utility-caps text-[10px] block opacity-50 mb-0.5">RESIDENT</span>
                  <div className="font-body text-sm font-semibold text-[var(--ink)]">
                    {getResidentName(selectedComplaint)} (UNIT: {selectedComplaint.apartment_no})
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="utility-caps text-[10px] block opacity-50 mb-0.5">CATEGORY</span>
                    <span className="font-utility text-xs font-bold uppercase text-[var(--ink)]">
                      {selectedComplaint.category}
                    </span>
                  </div>
                  <div>
                    <span className="utility-caps text-[10px] block opacity-50 mb-0.5">DATE FILED</span>
                    <span className="font-utility text-xs text-[var(--ink)]">
                      {fmtDate(selectedComplaint.created_at)}
                    </span>
                  </div>
                </div>

                <div>
                  <span className="utility-caps text-[10px] block opacity-50 mb-0.5">DEFECT REPORT</span>
                  <p className="font-body text-xs text-[var(--ink)] leading-relaxed bg-[#f9f9f8] p-3 border border-[var(--border)] whitespace-pre-wrap">
                    {selectedComplaint.description}
                  </p>
                </div>

                {selectedComplaint.photo_url && (
                  <div>
                    <span className="utility-caps text-[10px] block opacity-50 mb-1">EVIDENCE PHOTO</span>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={selectedComplaint.photo_url}
                      alt="Complaint Evidence"
                      className="w-full h-32 object-cover border border-[var(--border)] cursor-pointer"
                      onClick={() => window.open(selectedComplaint.photo_url!, "_blank")}
                    />
                  </div>
                )}

                {/* History Timeline */}
                <div>
                  <span className="utility-caps text-[10px] block opacity-50 mb-2">STATUS TIMELINE</span>
                  <div className="border-l border-[var(--border)] pl-4 ml-1.5 space-y-3 max-h-[150px] overflow-y-auto">
                    {selectedComplaint.complaint_status_history?.length === 0 ? (
                      <div className="font-utility text-[10px] opacity-40">NO PREVIOUS HISTORY ENTRIES.</div>
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
                              <p className="text-[10px] font-body text-[var(--ink)] opacity-80 italic mt-0.5">
                                &quot;{h.note}&quot;
                              </p>
                            )}
                            <p className="text-[9px] font-utility text-[var(--ink)] opacity-40">
                              {fmtDateTime(h.created_at)}
                            </p>
                          </div>
                        ))
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column: Update Form */}
              <div className="flex flex-col justify-between border-t md:border-t-0 md:border-l border-[var(--border)] pt-5 md:pt-0 md:pl-6">
                <form onSubmit={handleSaveChanges} className="flex flex-col gap-4">
                  <h4 className="font-display font-bold text-xs uppercase tracking-wide border-b border-[var(--border)] pb-2 mb-1">
                    MAINTENANCE CONTROLS
                  </h4>

                  {saveError && (
                    <div className="border border-[var(--status-open)] text-[var(--status-open)] p-2.5 font-utility text-[10px] bg-[#fdf2f0]">
                      ERROR: {saveError.toUpperCase()}
                    </div>
                  )}

                  {/* Priority select */}
                  <div>
                    <label htmlFor="edit-priority" className="utility-caps text-[10px] block mb-1 opacity-70">
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
                    <label htmlFor="edit-status" className="utility-caps text-[10px] block mb-1 opacity-70">
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
                    <label htmlFor="edit-note" className="utility-caps text-[10px] block mb-1 opacity-70">
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
                    <div className="border border-[var(--status-resolved)] text-[var(--status-resolved)] p-3 font-utility text-[10px] bg-[#f0fbf5] text-center leading-relaxed">
                      ★ TICKET CLOSED ★<br />RESOLVED ENTRIES ARE ARCHIVED AND READ-ONLY.
                    </div>
                  ) : (
                    <button
                      type="submit"
                      disabled={saving}
                      className="btn-minimal btn-minimal-accent w-full mt-2 disabled:opacity-50"
                    >
                      {saving ? "COMMITTING..." : "COMMIT UPDATE"}
                    </button>
                  )}
                </form>

                <button
                  type="button"
                  onClick={() => setSelectedComplaint(null)}
                  className="btn-minimal-secondary w-full text-xs py-2 mt-4"
                >
                  CANCEL
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      <main className="min-h-screen py-12 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto flex flex-col justify-between">
        {/* Top Header */}
        <header className="border-b border-[var(--border)] pb-6 mb-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <span className="utility-caps text-[var(--accent)] font-semibold tracking-widest text-xs">
              ADMINISTRATOR BOARD REGISTER
            </span>
            <h1 className="text-3xl font-bold tracking-tight text-[var(--ink)]">
              SUPERINTENDENT JOURNAL
            </h1>
          </div>
          <div className="flex gap-3">
            <Link 
              href="/admin/notices"
              className="btn-minimal-secondary text-xs py-2 px-4"
            >
              MANAGE NOTICES
            </Link>
            <Link 
              href="/notices"
              className="btn-minimal-secondary text-xs py-2 px-4"
            >
              VIEW CORKBOARD
            </Link>
            <button
              onClick={handleLogout}
              className="btn-minimal text-xs py-2 px-4"
            >
              EXIT JOURNAL
            </button>
          </div>
        </header>

        {/* Ledger Stat blocks */}
        <section className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-10">
          <div className="ledger-tab">
            <span className="utility-caps text-[10px] text-[var(--ink)] opacity-60">TOTAL REGISTERED</span>
            <div className="font-utility font-bold text-3xl mt-1 text-[var(--ink)]">
              {String(totalComplaintsCount).padStart(2, "0")}
            </div>
          </div>
          
          <div className="ledger-tab ledger-tab--open">
            <span className="utility-caps text-[10px] text-[var(--status-open)] font-semibold">OPEN ENTRIES</span>
            <div className="font-utility font-bold text-3xl mt-1 text-[var(--status-open)]">
              {String(openCount).padStart(2, "0")}
            </div>
          </div>
          
          <div className="ledger-tab ledger-tab--progress">
            <span className="utility-caps text-[10px] text-[var(--status-progress)] font-semibold">IN PROGRESS</span>
            <div className="font-utility font-bold text-3xl mt-1 text-[var(--status-progress)]">
              {String(progressCount).padStart(2, "0")}
            </div>
          </div>
          
          <div className="ledger-tab ledger-tab--resolved">
            <span className="utility-caps text-[10px] text-[var(--status-resolved)] font-semibold">RESOLVED</span>
            <div className="font-utility font-bold text-3xl mt-1 text-[var(--status-resolved)]">
              {String(resolvedCount).padStart(2, "0")}
            </div>
          </div>

          <div className="ledger-tab ledger-tab--open border-[var(--status-open)]">
            <span className="utility-caps text-[10px] text-[var(--status-open)] font-bold animate-pulse">★ OVERDUE</span>
            <div className="font-utility font-bold text-3xl mt-1 text-[var(--status-open)]">
              {String(overdueCount).padStart(2, "0")}
            </div>
          </div>
        </section>

        {/* Category Report Graph */}
        <section className="ledger-board p-5 bg-[var(--surface)] mb-10">
          <h2 className="text-xs font-bold font-display border-b border-[var(--border)] pb-2 mb-4 uppercase text-[var(--ink)] tracking-wider">
            DEPARTMENTAL COMPLAINT DISTRIBUTION
          </h2>
          <div className="w-full h-64">
            {mounted ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="category" stroke="var(--ink)" fontSize={9} tickLine={false} />
                  <YAxis stroke="var(--ink)" fontSize={9} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      background: "var(--surface)",
                      border: "1px solid var(--border)",
                      fontSize: "10px",
                      fontFamily: "var(--font-body)"
                    }}
                  />
                  <Bar dataKey="Complaints" fill="var(--accent)" barSize={30} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex items-center justify-center font-utility text-xs opacity-50">
                PREPARING DATA MODEL GRAPH...
              </div>
            )}
          </div>
        </section>

        {/* Admin Panel Details */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start mb-12">
          
          {/* left column: filters and notice form */}
          <section className="flex flex-col gap-6 lg:col-span-1">
            {/* Filters card */}
            <div className="ledger-board p-5 bg-[var(--surface)]">
              <h2 className="text-sm font-bold border-b border-[var(--border)] pb-2 mb-4 uppercase text-[var(--ink)] tracking-wider">
                FILTERS
              </h2>
              
              <div className="flex flex-col gap-4">
                <div>
                  <label htmlFor="filter-status" className="utility-caps text-[10px] block mb-1 opacity-70">
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
                  <label htmlFor="filter-cat" className="utility-caps text-[10px] block mb-1 opacity-70">
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
                  <label htmlFor="filter-search" className="utility-caps text-[10px] block mb-1 opacity-70">
                    Search Unit / Name
                  </label>
                  <input
                    id="filter-search"
                    type="text"
                    className="input-minimal font-utility"
                    placeholder="E.g. B-402"
                    value={searchUnit}
                    onChange={(e) => setSearchUnit(e.target.value)}
                  />
                </div>

                <div className="border-t border-dashed border-[var(--border)] my-1"></div>

                {/* Date range filter */}
                <div>
                  <label htmlFor="filter-start-date" className="utility-caps text-[10px] block mb-1 opacity-70">
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
                  <label htmlFor="filter-end-date" className="utility-caps text-[10px] block mb-1 opacity-70">
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
              </div>
            </div>

          </section>

          {/* right column: complaints ledger table (3 span) */}
          <section className="lg:col-span-3 flex flex-col gap-4">
            <h2 className="text-xl font-bold font-display uppercase text-[var(--ink)]">
              ADMINISTRATOR COMPLAINTS MASTER LEDGER
            </h2>

            <div className="ledger-board">
              {/* Header */}
              <div className="ledger-header">
                <span>UNIT</span>
                <span>ENTRY DETAILS & RESIDENT</span>
                <span>DATE</span>
                <span>STATUS STAMP</span>
              </div>

              {/* List */}
              {loadingData ? (
                <div className="p-8 text-center bg-[var(--surface)] border-b border-[var(--border)]">
                  <p className="font-utility text-xs opacity-50 animate-pulse">LOADING JOURNAL ENTRIES...</p>
                </div>
              ) : sortedComplaints.length === 0 ? (
                <div className="p-8 text-center bg-[var(--surface)] border-b border-[var(--border)] last:border-b-0">
                  <p className="font-utility text-xs opacity-60">NO ENTRIES FOUND MATCHING SELECTION.</p>
                </div>
              ) : (
                <div className="divide-y divide-[var(--border)]">
                  {sortedComplaints.map((comp) => {
                    const isCompOverdue = isOverdue(comp);
                    return (
                      <div
                        key={comp.id}
                        onClick={() => openEditDialog(comp)}
                        className="ledger-row cursor-pointer"
                      >
                        {/* Unit prefix */}
                        <div className="ledger-unit font-utility font-bold text-sm">
                          {comp.apartment_no}
                        </div>
                        
                        {/* Description & Category details */}
                        <div className="pr-4 py-1">
                          <div className="flex gap-2 items-center mb-1 flex-wrap">
                            <span className="font-utility text-[10px] font-semibold text-[var(--accent)] tracking-wider">
                              {comp.category.toUpperCase()}
                            </span>
                            <span className={`font-utility text-[9px] font-semibold tracking-wider px-1 border ${
                              comp.priority === "High" 
                                ? "border-[var(--status-open)] text-[var(--status-open)] animate-pulse" 
                                : comp.priority === "Medium" 
                                ? "border-[var(--accent)] text-[var(--accent)]" 
                                : "border-[var(--border)] text-[var(--ink)] opacity-60"
                            }`}>
                              {comp.priority.toUpperCase()}
                            </span>
                            {isCompOverdue && (
                              <span className="font-utility text-[9px] font-bold tracking-wider px-1.5 py-0.5 bg-[var(--status-open)] text-white animate-pulse">
                                OVERDUE
                              </span>
                            )}
                            <span className="font-utility text-[10px] text-[var(--ink)] opacity-40">
                              REF: {comp.id}
                            </span>
                          </div>
                          
                          {/* Resident Name */}
                          <div className="text-[10px] font-utility font-semibold text-[var(--ink)] opacity-70 mb-0.5">
                            BY: {getResidentName(comp)}
                          </div>
                          <p className="font-body text-xs text-[var(--ink)] font-medium leading-relaxed line-clamp-1">
                            {comp.description}
                          </p>
                        </div>

                        {/* Date */}
                        <div className="font-utility text-xs text-[var(--ink)] opacity-70">
                          {fmtDate(comp.created_at)}
                        </div>

                        {/* Status Stamp */}
                        <div className="status-stamp-container">
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

        {/* Footer copyright */}
        <footer className="border-t border-[var(--border)] pt-8 text-center text-xs font-utility text-[var(--ink)] opacity-60 mt-12">
          <p>© 2026 SOCIETY-FIX. DEPUTY SUPERINTENDENT OFFICE SECURED ARCHIVES.</p>
        </footer>
      </main>
    </>
  );
}
