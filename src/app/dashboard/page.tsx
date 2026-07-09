"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createClient } from "@/utils/supabase/client";
import Navigation from "@/app/components/Navigation";
import { Skeleton } from "@/app/components/Skeleton";
import { toast } from "sonner";
import { ClipboardList, Image as ImageIcon } from "lucide-react";

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

  const handleBackdrop = (e: React.MouseEvent) => {
    if (dialogRef.current && !dialogRef.current.contains(e.target as Node)) {
      onClose();
    }
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
      onClick={handleBackdrop}
    >
      <div
        ref={dialogRef}
        className="ledger-board bg-[var(--surface)] w-full max-w-lg max-h-[80vh] flex flex-col rounded-[6px]"
      >
        {/* Dialog Header */}
        <div className="bg-[var(--surface-2)] border-b border-[var(--border)] text-[var(--ink)] px-5 py-4 flex items-start justify-between gap-4 flex-shrink-0">
          <div>
            <div className="font-utility text-[10px] tracking-widest text-[var(--ink-muted)] mb-1">
              COMPLAINT STATUS TIMELINE
            </div>
            <h2 className="font-display font-bold text-base leading-tight uppercase">
              {complaint.category} — {complaint.priority} PRIORITY
            </h2>
            <p className="font-utility text-[10px] text-[var(--ink-muted)] mt-0.5">
              FILED: {fmtDate(complaint.created_at)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="font-utility text-xs text-[var(--ink-muted)] hover:text-[var(--ink)] flex-shrink-0 mt-1"
            aria-label="Close"
          >
            [ESC]
          </button>
        </div>

        {/* Description */}
        <div className="px-5 py-3 border-b border-[var(--border)] bg-[var(--surface-2)]/30 flex-shrink-0">
          <p className="font-body text-xs text-[var(--ink)] leading-relaxed">
            {complaint.description}
          </p>
        </div>

        {/* Timeline */}
        <div className="overflow-y-auto flex-1 px-5 py-4">
          {history.length === 0 ? (
            <div className="text-center py-8">
              <p className="font-utility text-[11px] text-[var(--ink-muted)]">
                NO STATUS HISTORY RECORDED.
              </p>
              <p className="font-utility text-[10px] text-[var(--ink-muted)] opacity-60 mt-1">
                ENTRY FRESHLY FILED — AWAITING REVIEW.
              </p>
            </div>
          ) : (
            <ol className="relative border-l border-[var(--border)] pl-5 space-y-5">
              {[...history]
                .sort(
                  (a, b) =>
                    new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
                )
                .map((entry, idx) => (
                  <li key={entry.id} className="relative">
                    {/* Timeline dot */}
                    <span
                      className={`absolute -left-[24px] top-1.5 w-2 h-2 rounded-full border border-[var(--surface)] ${
                        idx === history.length - 1
                          ? "bg-[var(--accent)]"
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
                          <p className="font-body text-xs text-[var(--ink)] leading-relaxed mt-1 italic">
                            &quot;{entry.note}&quot;
                          </p>
                        )}
                        <p className="font-utility text-[10px] text-[var(--ink-muted)] mt-1.5">
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
          <button onClick={onClose} className="btn-minimal-secondary w-full text-xs py-2 rounded-[6px]">
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
    Medium: "border-[var(--ink-muted)] text-[var(--ink-muted)]",
    Low:    "border-[var(--border)] text-[var(--ink-muted)]",
  };

  return (
    <div className="ledger-board bg-[var(--surface)] hover:shadow-md hover:border-[var(--ink-muted)]/30 transition-all duration-150 rounded-[6px]">
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
              className={`font-utility text-[9px] font-bold tracking-wider px-1.5 py-0.5 border rounded-[6px] ${
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
        <p className="font-body text-xs text-[var(--ink-muted)] leading-relaxed mb-3 line-clamp-2">
          {complaint.description}
        </p>

        {/* Row 3: metadata + action */}
        <div className="flex items-center justify-between gap-3 border-t border-dashed border-[var(--border)] pt-3">
          <span className="font-utility text-[10px] text-[var(--ink-muted)]">
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
        toast.error(`PHOTO UPLOAD FAILED: ${uploadErr.message.toUpperCase()}`);
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
        status: "Open",
        photo_url: photoUrl,
      })
      .select(`
        id, category, priority, description, status, photo_url, created_at,
        complaint_status_history ( id, status, note, created_at )
      `)
      .single();

    if (insertErr) {
      toast.error(`COULD NOT RECORD ENTRY: ${insertErr.message.toUpperCase()}`);
      setSubmitting(false);
      return;
    }

    setComplaints((prev) => [newComplaint as Complaint, ...prev]);
    reset({ category: "Plumbing", priority: "Medium", description: "" });
    setPhotoPreview(null);
    toast.success("ENTRY DULY COMMITTED TO LEDGER REGISTER");
    setSubmitting(false);
  };

  return (
    <>
      <Navigation />
      {/* History Dialog */}
      {activeDialog && (
        <HistoryDialog
          complaint={activeDialog}
          onClose={() => setActiveDialog(null)}
        />
      )}

      <main className="min-h-[calc(100vh-64px)] py-12 px-4 md:px-6 max-w-[1280px] mx-auto flex flex-col gap-12">
        {/* Page Header */}
        <header className="border-b border-[var(--border)] pb-6 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <span className="utility-caps text-[var(--ink-muted)] font-semibold tracking-widest text-xs block mb-1">
              RESIDENT COMPLAINTS REGISTER
            </span>
            <h1 className="text-3xl font-bold tracking-tight text-[var(--ink)] flex items-center gap-3">
              {profile?.full_name || "RESIDENT"}
              <span className="font-utility text-sm font-bold px-2 py-0.5 border border-[var(--ink)] bg-[var(--ink)] text-[var(--bg)] rounded-[6px]">
                {profile?.apartment_no}
              </span>
            </h1>
          </div>
        </header>

        {loadingData ? (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
            <div className="lg:col-span-2 ledger-board bg-[var(--surface)] p-6 flex flex-col gap-4 animate-pulse">
              <Skeleton className="h-6 w-1/2" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-28 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="lg:col-span-3 flex flex-col gap-4 animate-pulse">
              <div className="flex justify-between items-center">
                <Skeleton className="h-6 w-1/3" />
                <Skeleton className="h-6 w-16" />
              </div>
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
            {/* Left: Raise Complaint Form */}
            <section className="lg:col-span-2 ledger-board bg-[var(--surface)]">
              <div className="bg-[var(--surface-2)] border-b border-[var(--border)] px-5 py-3">
                <h2 className="font-display font-bold text-sm uppercase tracking-wide text-[var(--ink)]">
                  RAISE COMPLAINT ENTRY
                </h2>
              </div>

              <div className="p-5">
                <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
                  {/* Category */}
                  <div>
                    <label htmlFor="cat" className="utility-caps text-[10px] block mb-2 text-[var(--ink)] opacity-80">
                      Department / Category *
                    </label>
                    <select id="cat" className="select-minimal" {...register("category")}>
                      {["Plumbing","Electrical","Cleaning","Security","Parking","Other"].map((c) => (
                        <option key={c} value={c}>{c.toUpperCase()}</option>
                      ))}
                    </select>
                    {errors.category && (
                      <p className="font-utility text-[10px] text-[var(--status-open)] mt-1.5">
                        {errors.category.message}
                      </p>
                    )}
                  </div>

                  {/* Priority */}
                  <div>
                    <label htmlFor="priority" className="utility-caps text-[10px] block mb-2 text-[var(--ink)] opacity-80">
                      Priority Tier *
                    </label>
                    <div className="flex gap-2">
                      {(["Low", "Medium", "High"] as const).map((p) => (
                        <label
                          key={p}
                          className={`flex-1 text-center cursor-pointer font-utility text-[10px] font-bold tracking-wider py-2 border rounded-[6px] transition-colors ${
                            watch("priority") === p
                              ? p === "High"
                                ? "bg-[var(--status-open)] border-[var(--status-open)] text-white"
                                : p === "Medium"
                                ? "bg-[var(--accent)] border-[var(--accent)] text-white"
                                : "bg-[var(--ink)] border-[var(--ink)] text-[var(--bg)]"
                              : "border-[var(--border)] text-[var(--ink-muted)] hover:border-[var(--ink)]"
                          }`}
                        >
                          <input type="radio" value={p} className="sr-only" {...register("priority")} />
                          {p.toUpperCase()}
                        </label>
                      ))}
                    </div>
                    {errors.priority && (
                      <p className="font-utility text-[10px] text-[var(--status-open)] mt-1.5">
                        {errors.priority.message}
                      </p>
                    )}
                  </div>

                  {/* Description */}
                  <div>
                    <label htmlFor="desc" className="utility-caps text-[10px] block mb-2 text-[var(--ink)] opacity-80">
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
                      <p className="font-utility text-[10px] text-[var(--status-open)] mt-1.5">
                        {errors.description.message}
                      </p>
                    )}
                  </div>

                  {/* Photo Upload */}
                  <div>
                    <label htmlFor="photo" className="utility-caps text-[10px] block mb-2 text-[var(--ink)] opacity-80">
                      Evidence Photo (optional · JPG/PNG/WEBP · max 5 MB)
                    </label>
                    <label
                      htmlFor="photo"
                      className="block w-full border border-dashed border-[var(--border)] rounded-[6px] cursor-pointer hover:border-[var(--ink-muted)] transition-colors overflow-hidden"
                    >
                      {photoPreview ? (
                        <div className="relative">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={photoPreview}
                            alt="Preview"
                            className="w-full h-36 object-cover"
                          />
                          <span className="absolute top-2 right-2 bg-[var(--surface)] text-[var(--ink)] border border-[var(--border)] font-utility text-[9px] px-1.5 py-0.5 rounded-[4px]">
                            CHANGE
                          </span>
                        </div>
                      ) : (
                        <div className="h-24 flex flex-col items-center justify-center gap-2 px-4 text-center">
                          <ImageIcon className="w-6 h-6 text-[var(--ink-muted)] opacity-50" />
                          <span className="font-utility text-[10px] text-[var(--ink-muted)]">CLICK TO ATTACH EVIDENCE</span>
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
                      <p className="font-utility text-[10px] text-[var(--status-open)] mt-1.5">
                        {errors.photo.message as string}
                      </p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="btn-minimal w-full mt-2 disabled:opacity-50 rounded-[6px]"
                  >
                    {submitting ? "COMMITTING..." : "COMMIT ENTRY TO LEDGER"}
                  </button>
                </form>
              </div>
            </section>

            {/* Right: Complaints List */}
            <section className="lg:col-span-3 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h2 className="font-display font-bold text-xl uppercase tracking-tight text-[var(--ink)]">
                  MY COMPLAINT LOG
                </h2>
                <span className="font-utility text-[10px] text-[var(--ink-muted)] border border-[var(--border)] px-2 py-1 rounded-[6px]">
                  {complaints.length} {complaints.length === 1 ? "ENTRY" : "ENTRIES"}
                </span>
              </div>

              {complaints.length === 0 ? (
                <div className="ledger-board bg-[var(--surface)] p-10 text-center flex flex-col items-center justify-center gap-4">
                  <div className="w-12 h-12 rounded-full border border-[var(--border)] flex items-center justify-center bg-[var(--surface-2)]">
                    <ClipboardList className="w-6 h-6 text-[var(--accent)]" />
                  </div>
                  <div>
                    <p className="font-utility text-xs text-[var(--ink)] uppercase font-semibold tracking-wider">
                      NO ENTRIES IN YOUR REGISTER YET
                    </p>
                    <p className="font-body text-xs text-[var(--ink-muted)] mt-1.5 max-w-sm">
                      Your journal is clean. Use the form to file your first complaint entry and commit it to our secure system log.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
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
        )}

        {/* Footer */}
        <footer className="border-t border-[var(--border)] pt-8 text-center text-xs font-utility text-[var(--ink-muted)]">
          © 2026 SOCIETY-FIX. RESIDENT COMPLAINTS REGISTER.
        </footer>
      </main>
    </>
  );
}
