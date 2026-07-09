"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createClient } from "@/utils/supabase/client";

// ─── Zod Schema ────────────────────────────────────────────────────────────────
const categories = ["Plumbing", "Electrical", "Cleaning", "Security", "Parking", "Other"] as const;
const priorities = ["Low", "Medium", "High"] as const;

const complaintSchema = z.object({
  category: z.enum(categories, { message: "CATEGORY REQUIRED" }),
  priority: z.enum(priorities, { message: "PRIORITY REQUIRED" }),
  description: z
    .string()
    .min(20, "DESCRIPTION MUST BE AT LEAST 20 CHARACTERS")
    .max(1000, "DESCRIPTION TOO LONG"),
  photo: z
    .custom<FileList>()
    .optional()
    .refine(
      (files) => !files || files.length === 0 || files[0].size <= 5 * 1024 * 1024,
      "PHOTO MUST BE UNDER 5 MB"
    )
    .refine(
      (files) =>
        !files ||
        files.length === 0 ||
        ["image/jpeg", "image/png", "image/webp"].includes(files[0].type),
      "ONLY JPG, PNG, WEBP ALLOWED"
    ),
});

type ComplaintFormValues = z.infer<typeof complaintSchema>;

// ─── Types ─────────────────────────────────────────────────────────────────────
interface StatusHistoryEntry {
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
  complaint_status_history?: StatusHistoryEntry[];
}

interface UserProfile {
  id: string;
  full_name: string;
  apartment_no: string;
  role: string;
}

// ─── Status stamp helpers ───────────────────────────────────────────────────────
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

// ─── History Dialog ────────────────────────────────────────────────────────────
function HistoryDialog({
  complaint,
  onClose,
}: {
  complaint: Complaint;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const history = complaint.complaint_status_history ?? [];

  // Close on backdrop click
  const handleBackdrop = (e: React.MouseEvent) => {
    if (dialogRef.current && !dialogRef.current.contains(e.target as Node)) {
      onClose();
    }
  };

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
      onClick={handleBackdrop}
    >
      <div
        ref={dialogRef}
        className="ledger-board bg-[var(--surface)] w-full max-w-lg max-h-[80vh] flex flex-col"
      >
        {/* Dialog Header */}
        <div className="bg-[var(--ink)] text-[var(--bg)] px-5 py-4 flex items-start justify-between gap-4 flex-shrink-0">
          <div>
            <div className="font-utility text-[10px] tracking-widest opacity-60 mb-1">
              COMPLAINT STATUS TIMELINE
            </div>
            <h2 className="font-display font-bold text-base leading-tight">
              {complaint.category.toUpperCase()} — {complaint.priority.toUpperCase()} PRIORITY
            </h2>
            <p className="font-utility text-[10px] opacity-50 mt-0.5">
              FILED: {fmtDate(complaint.created_at)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="font-utility text-xs text-[var(--bg)] opacity-60 hover:opacity-100 flex-shrink-0 mt-1"
            aria-label="Close"
          >
            [ESC]
          </button>
        </div>

        {/* Description */}
        <div className="px-5 py-3 border-b border-[var(--border)] bg-[#fafaf8] flex-shrink-0">
          <p className="font-body text-xs text-[var(--ink)] leading-relaxed opacity-85">
            {complaint.description}
          </p>
        </div>

        {/* Timeline */}
        <div className="overflow-y-auto flex-1 px-5 py-4">
          {history.length === 0 ? (
            <div className="text-center py-8">
              <p className="font-utility text-[11px] text-[var(--ink)] opacity-50">
                NO STATUS HISTORY RECORDED.
              </p>
              <p className="font-utility text-[10px] opacity-40 mt-1">
                ENTRY FRESHLY FILED — AWAITING REVIEW.
              </p>
            </div>
          ) : (
            <ol className="relative border-l-2 border-[var(--border)] pl-5 space-y-5">
              {[...history]
                .sort(
                  (a, b) =>
                    new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
                )
                .map((entry, idx) => (
                  <li key={entry.id} className="relative">
                    {/* Timeline dot */}
                    <span
                      className={`absolute -left-[25px] top-0.5 w-3 h-3 rounded-full border-2 border-[var(--surface)] ${
                        idx === history.length - 1
                          ? "bg-[var(--ink)]"
                          : "bg-[var(--border)]"
                      }`}
                    />
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className={getStampClass(entry.status)}>
                            {fmtStatus(entry.status)}
                          </span>
                        </div>
                        {entry.note && (
                          <p className="font-body text-xs text-[var(--ink)] opacity-80 leading-relaxed mt-1">
                            {entry.note}
                          </p>
                        )}
                        <p className="font-utility text-[10px] text-[var(--ink)] opacity-45 mt-1.5">
                          {fmtDateTime(entry.created_at)}
                        </p>
                      </div>
                    </div>
                  </li>
                ))}
            </ol>
          )}
        </div>

        {/* Dialog footer */}
        <div className="border-t border-[var(--border)] px-5 py-3 flex-shrink-0">
          <button onClick={onClose} className="btn-minimal-secondary w-full text-xs py-2">
            CLOSE TIMELINE
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Complaint Card ────────────────────────────────────────────────────────────
function ComplaintCard({
  complaint,
  onViewHistory,
}: {
  complaint: Complaint;
  onViewHistory: (c: Complaint) => void;
}) {
  const priorityStyle: Record<string, string> = {
    High:   "border-[var(--status-open)] text-[var(--status-open)]",
    Medium: "border-[var(--accent)] text-[var(--accent)]",
    Low:    "border-[var(--border)] text-[var(--ink)] opacity-70",
  };

  return (
    <div className="ledger-board bg-[var(--surface)] hover:shadow-md transition-shadow duration-150">
      {/* Card top stripe per category */}
      <div
        className="h-[3px]"
        style={{
          background:
            complaint.category === "Plumbing" ? "var(--status-progress)" :
            complaint.category === "Electrical" ? "var(--accent)" :
            complaint.category === "Cleaning" ? "var(--status-resolved)" :
            complaint.category === "Security" ? "var(--status-open)" :
            complaint.category === "Parking" ? "var(--ink)" :
            "var(--border)",
        }}
      />

      <div className="px-5 py-4">
        {/* Row 1: category + stamps */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-utility font-bold text-sm text-[var(--ink)] tracking-tight">
              {complaint.category.toUpperCase()}
            </span>
            <span
              className={`font-utility text-[9px] font-bold tracking-wider px-1.5 py-0.5 border ${
                priorityStyle[complaint.priority] || priorityStyle.Low
              }`}
            >
              {complaint.priority.toUpperCase()}
            </span>
          </div>
          <div className="status-stamp-container flex-shrink-0">
            <span className={getStampClass(complaint.status)}>
              {fmtStatus(complaint.status)}
            </span>
          </div>
        </div>

        {/* Row 2: Description excerpt */}
        <p className="font-body text-xs text-[var(--ink)] opacity-80 leading-relaxed mb-3 line-clamp-2">
          {complaint.description}
        </p>

        {/* Row 3: metadata + action */}
        <div className="flex items-center justify-between gap-3 border-t border-dashed border-[var(--border)] pt-3">
          <span className="font-utility text-[10px] text-[var(--ink)] opacity-50">
            FILED {fmtDate(complaint.created_at)}
          </span>
          <button
            onClick={() => onViewHistory(complaint)}
            className="font-utility text-[10px] font-bold text-[var(--accent)] hover:underline tracking-wider"
          >
            VIEW HISTORY →
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function ResidentDashboard() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [activeDialog, setActiveDialog] = useState<Complaint | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<ComplaintFormValues>({
    resolver: zodResolver(complaintSchema),
    defaultValues: { category: "Plumbing", priority: "Medium" },
  });

  // Watch photo for preview
  const watchedPhoto = watch("photo");
  useEffect(() => {
    if (watchedPhoto && watchedPhoto.length > 0) {
      const url = URL.createObjectURL(watchedPhoto[0]);
      setPhotoPreview(url);
      return () => URL.revokeObjectURL(url);
    }
    setPhotoPreview(null);
  }, [watchedPhoto]);

  // Load session + complaints
  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const {
        data: { user },
        error: authErr,
      } = await supabase.auth.getUser();

      if (authErr || !user) {
        router.push("/login");
        return;
      }

      const { data: prof } = await supabase
        .from("profiles")
        .select("id, full_name, apartment_no, role")
        .eq("id", user.id)
        .single();

      if (!prof || prof.role !== "resident") {
        router.push(prof?.role === "admin" ? "/admin" : "/login");
        return;
      }

      setProfile(prof);

      // Fetch this resident's complaints with their status history
      const { data: comps } = await supabase
        .from("complaints")
        .select(`
          id, category, priority, description, status, photo_url, created_at,
          complaint_status_history ( id, status, note, created_at )
        `)
        .eq("resident_id", user.id)
        .order("created_at", { ascending: false });

      setComplaints((comps as Complaint[]) ?? []);
      setLoadingData(false);
    }
    load();
  }, [router]);

  // Form submit
  const onSubmit = async (values: ComplaintFormValues) => {
    if (!profile) return;
    setSubmitting(true);
    setSubmitError("");

    const supabase = createClient();
    let photoUrl: string | null = null;

    // Upload photo if provided
    if (values.photo && values.photo.length > 0) {
      const file = values.photo[0];
      const ext = file.name.split(".").pop();
      const filename = `${profile.id}/${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from("complaint-photos")
        .upload(filename, file, { upsert: false });

      if (uploadErr) {
        setSubmitError(`PHOTO UPLOAD FAILED: ${uploadErr.message}`);
        setSubmitting(false);
        return;
      }

      const { data: publicData } = supabase.storage
        .from("complaint-photos")
        .getPublicUrl(filename);
      photoUrl = publicData.publicUrl;
    }

    // Insert complaint row
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data: newComplaint, error: insertErr } = await supabase
      .from("complaints")
      .insert({
        resident_id: user!.id,
        apartment_no: profile.apartment_no,
        category: values.category,
        priority: values.priority,
        description: values.description,
        status: "open",
        photo_url: photoUrl,
      })
      .select(`
        id, category, priority, description, status, photo_url, created_at,
        complaint_status_history ( id, status, note, created_at )
      `)
      .single();

    if (insertErr) {
      setSubmitError(`COULD NOT RECORD ENTRY: ${insertErr.message}`);
      setSubmitting(false);
      return;
    }

    setComplaints((prev) => [newComplaint as Complaint, ...prev]);
    reset({ category: "Plumbing", priority: "Medium", description: "" });
    setPhotoPreview(null);
    setSubmitSuccess(true);
    setSubmitting(false);
    setTimeout(() => setSubmitSuccess(false), 4000);
  };

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  // ── Loading state ────────────────────────────────────────────────────────────
  if (loadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="font-utility text-xs text-[var(--ink)] opacity-50 tracking-widest animate-pulse">
            LOADING LEDGER ENTRIES...
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* History Dialog */}
      {activeDialog && (
        <HistoryDialog
          complaint={activeDialog}
          onClose={() => setActiveDialog(null)}
        />
      )}

      <main className="min-h-screen py-12 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
        {/* ── Page Header ───────────────────────────────────────────────────── */}
        <header className="border-b border-[var(--border)] pb-6 mb-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <span className="utility-caps text-[var(--accent)] font-semibold tracking-widest text-xs block mb-1">
              RESIDENT COMPLAINTS REGISTER
            </span>
            <h1 className="text-3xl font-bold tracking-tight text-[var(--ink)] flex items-center gap-3">
              {profile?.full_name || "RESIDENT"}
              <span className="font-utility text-sm font-bold px-2 py-0.5 border border-[var(--ink)] bg-[var(--ink)] text-[var(--bg)] align-middle">
                {profile?.apartment_no}
              </span>
            </h1>
          </div>
          <div className="flex gap-3">
            <Link href="/notices" className="btn-minimal-secondary text-xs py-2 px-4">
              NOTICE BOARD
            </Link>
            <button onClick={handleLogout} className="btn-minimal text-xs py-2 px-4">
              SIGN OUT
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
          {/* ── Left: Raise Complaint Form ───────────────────────────────────── */}
          <section className="lg:col-span-2 ledger-board bg-[var(--surface)]">
            <div className="bg-[var(--ink)] text-[var(--bg)] px-5 py-3">
              <h2 className="font-display font-bold text-sm uppercase tracking-wide">
                RAISE COMPLAINT ENTRY
              </h2>
            </div>

            <div className="p-5">
              {submitSuccess && (
                <div className="border border-[var(--status-resolved)] text-[var(--status-resolved)] p-3 font-utility text-[11px] mb-4 bg-[#f0fbf5]">
                  ENTRY DULY COMMITTED TO LEDGER REGISTER.
                </div>
              )}
              {submitError && (
                <div className="border border-[var(--status-open)] text-[var(--status-open)] p-3 font-utility text-[11px] mb-4 bg-[#fdf2f0]">
                  {submitError}
                </div>
              )}

              <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
                {/* Category */}
                <div>
                  <label htmlFor="cat" className="utility-caps text-[10px] block mb-1 opacity-80">
                    Department / Category *
                  </label>
                  <select id="cat" className="select-minimal" {...register("category")}>
                    {["Plumbing","Electrical","Cleaning","Security","Parking","Other"].map((c) => (
                      <option key={c} value={c}>{c.toUpperCase()}</option>
                    ))}
                  </select>
                  {errors.category && (
                    <p className="font-utility text-[10px] text-[var(--status-open)] mt-1">
                      {errors.category.message}
                    </p>
                  )}
                </div>

                {/* Priority */}
                <div>
                  <label htmlFor="priority" className="utility-caps text-[10px] block mb-1 opacity-80">
                    Priority Tier *
                  </label>
                  <div className="flex gap-2">
                    {(["Low", "Medium", "High"] as const).map((p) => (
                      <label
                        key={p}
                        className={`flex-1 text-center cursor-pointer font-utility text-[10px] font-bold tracking-wider py-2 border transition-colors ${
                          watch("priority") === p
                            ? p === "High"
                              ? "bg-[var(--status-open)] border-[var(--status-open)] text-white"
                              : p === "Medium"
                              ? "bg-[var(--accent)] border-[var(--accent)] text-white"
                              : "bg-[var(--ink)] border-[var(--ink)] text-[var(--bg)]"
                            : "border-[var(--border)] text-[var(--ink)] hover:border-[var(--ink)]"
                        }`}
                      >
                        <input type="radio" value={p} className="sr-only" {...register("priority")} />
                        {p.toUpperCase()}
                      </label>
                    ))}
                  </div>
                  {errors.priority && (
                    <p className="font-utility text-[10px] text-[var(--status-open)] mt-1">
                      {errors.priority.message}
                    </p>
                  )}
                </div>

                {/* Description */}
                <div>
                  <label htmlFor="desc" className="utility-caps text-[10px] block mb-1 opacity-80">
                    Description of Defect * (min. 20 chars)
                  </label>
                  <textarea
                    id="desc"
                    rows={5}
                    className="input-minimal resize-none font-body text-sm"
                    placeholder="DESCRIBE THE ISSUE IN DETAIL..."
                    {...register("description")}
                  />
                  {errors.description && (
                    <p className="font-utility text-[10px] text-[var(--status-open)] mt-1">
                      {errors.description.message}
                    </p>
                  )}
                </div>

                {/* Photo Upload */}
                <div>
                  <label htmlFor="photo" className="utility-caps text-[10px] block mb-1 opacity-80">
                    Evidence Photo (optional · JPG/PNG/WEBP · max 5 MB)
                  </label>
                  <label
                    htmlFor="photo"
                    className="block w-full border border-dashed border-[var(--border)] cursor-pointer hover:border-[var(--ink)] transition-colors"
                  >
                    {photoPreview ? (
                      <div className="relative">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={photoPreview}
                          alt="Preview"
                          className="w-full h-36 object-cover"
                        />
                        <span className="absolute top-1 right-1 bg-[var(--ink)] text-[var(--bg)] font-utility text-[9px] px-1.5 py-0.5">
                          CHANGE
                        </span>
                      </div>
                    ) : (
                      <div className="h-24 flex flex-col items-center justify-center gap-1 px-4 text-center">
                        <svg className="w-6 h-6 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                            d="M3 16l4-4 4 4 4-6 4 6M3 20h18" />
                        </svg>
                        <span className="font-utility text-[10px] opacity-50">CLICK TO ATTACH EVIDENCE</span>
                      </div>
                    )}
                  </label>
                  <input
                    id="photo"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="sr-only"
                    {...register("photo")}
                  />
                  {errors.photo && (
                    <p className="font-utility text-[10px] text-[var(--status-open)] mt-1">
                      {errors.photo.message as string}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-minimal w-full mt-2 disabled:opacity-50"
                >
                  {submitting ? "COMMITTING..." : "COMMIT ENTRY TO LEDGER"}
                </button>
              </form>
            </div>
          </section>

          {/* ── Right: Complaints List ────────────────────────────────────────── */}
          <section className="lg:col-span-3 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display font-bold text-xl uppercase tracking-tight text-[var(--ink)]">
                MY COMPLAINT LOG
              </h2>
              <span className="font-utility text-[10px] text-[var(--ink)] opacity-50 border border-[var(--border)] px-2 py-1">
                {complaints.length} {complaints.length === 1 ? "ENTRY" : "ENTRIES"}
              </span>
            </div>

            {complaints.length === 0 ? (
              <div className="ledger-board bg-[var(--surface)] p-10 text-center">
                <p className="font-utility text-[11px] text-[var(--ink)] opacity-50 tracking-wider">
                  NO ENTRIES IN YOUR REGISTER YET.
                </p>
                <p className="font-utility text-[10px] opacity-40 mt-1">
                  USE THE FORM TO FILE YOUR FIRST COMPLAINT.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {complaints.map((c) => (
                  <ComplaintCard
                    key={c.id}
                    complaint={c}
                    onViewHistory={(comp) => setActiveDialog(comp)}
                  />
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Footer */}
        <footer className="border-t border-[var(--border)] pt-8 mt-16 text-center text-xs font-utility text-[var(--ink)] opacity-50">
          © 2026 SOCIETY-FIX. RESIDENT COMPLAINTS REGISTER.
        </footer>
      </main>
    </>
  );
}
