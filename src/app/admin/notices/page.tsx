"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/utils/supabase/client";
import Navigation from "@/app/components/Navigation";
import { Skeleton } from "@/app/components/Skeleton";
import ConfirmDialog from "@/app/components/ConfirmDialog";
import { toast } from "sonner";
import { Pin, Trash2, Megaphone, AlertCircle } from "lucide-react";

interface Notice {
  id: string;
  title: string;
  body: string;
  is_important: boolean;
  created_at: string;
  author: string;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function AdminNoticesPage() {
  const router = useRouter();
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [isImportant, setIsImportant] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Validation States
  const [titleError, setTitleError] = useState("");
  const [bodyError, setBodyError] = useState("");

  // Confirmation state for deleting
  const [deleteNoticeId, setDeleteNoticeId] = useState<string | null>(null);

  const fetchNotices = async () => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("notices")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setNotices((data as Notice[]) ?? []);
    } catch (err: unknown) {
      console.error("Failed to load notices from DB:", err);
    }
  };

  useEffect(() => {
    const checkSession = async () => {
      const supabase = createClient();
      const { data: { user }, error: authErr } = await supabase.auth.getUser();

      if (authErr || !user) {
        router.push("/login");
        return;
      }

      const { data: prof } = await supabase
        .from("profiles")
        .select("id, full_name, role")
        .eq("id", user.id)
        .single();

      if (!prof || prof.role !== "admin") {
        router.push(prof?.role === "resident" ? "/dashboard" : "/login");
        return;
      }

      await fetchNotices();
      setLoading(false);
    };

    checkSession();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTitleError("");
    setBodyError("");

    let hasError = false;
    if (!title.trim()) {
      setTitleError("NOTICE HEADING IS REQUIRED");
      hasError = true;
    }
    if (!body.trim()) {
      setBodyError("NOTICE CONTENT IS REQUIRED");
      hasError = true;
    }

    if (hasError) return;

    setSubmitting(true);

    try {
      const res = await fetch("/api/admin/create-notice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim().toUpperCase(),
          bodyText: body.trim(),
          isImportant,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "COULD NOT RECORD NOTICE.");
      }

      toast.success("NOTICE CIRCULAR PUBLISHED SUCCESSFULLY");
      setTitle("");
      setBody("");
      setIsImportant(false);
      await fetchNotices();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "COULD NOT RECORD NOTICE.";
      toast.error(`ERROR: ${msg.toUpperCase()}`);
    } finally {
      setSubmitting(false);
    }
  };

  const executeDelete = async (id: string) => {
    try {
      const supabase = createClient();
      const { error } = await supabase.from("notices").delete().eq("id", id);
      if (error) throw error;
      toast.success("NOTICE CIRCULAR SUCCESSFULLY REMOVED");
      await fetchNotices();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "UNKNOWN ERROR";
      toast.error(`FAILED TO DELETE: ${msg.toUpperCase()}`);
    }
  };

  return (
    <>
      <Navigation />

      {/* Custom Confirmation Dialog for circular removal */}
      <ConfirmDialog
        isOpen={deleteNoticeId !== null}
        title="REMOVE BULLETIN CIRCULAR?"
        description="Are you sure you want to permanently remove this official notice? Residents will no longer see this pinned or regular notice on their corkboard registers."
        onConfirm={() => {
          if (deleteNoticeId) {
            executeDelete(deleteNoticeId);
            setDeleteNoticeId(null);
          }
        }}
        onCancel={() => setDeleteNoticeId(null)}
        confirmText="REMOVE BULLETINS"
      />

      <main className="min-h-[calc(100vh-64px)] py-12 px-4 md:px-6 max-w-[1280px] mx-auto flex flex-col gap-12">
        {/* Page Header */}
        <header className="border-b border-[var(--border)] pb-6 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <span className="utility-caps text-[var(--ink-muted)] font-semibold tracking-widest text-xs">
              ADMINISTRATOR BOARD NOTICES
            </span>
            <h1 className="text-3xl font-bold tracking-tight text-[var(--ink)] mt-1">
              OFFICIAL CIRCULAR JOURNAL
            </h1>
          </div>
        </header>

        {loading ? (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
            <div className="lg:col-span-2 ledger-board bg-[var(--surface)] p-6 flex flex-col gap-4 animate-pulse">
              <Skeleton className="h-6 w-1/2" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="lg:col-span-3 flex flex-col gap-4 animate-pulse">
              <div className="flex justify-between items-center">
                <Skeleton className="h-6 w-1/3" />
                <Skeleton className="h-6 w-16" />
              </div>
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
            {/* Left Form: Post Notice */}
            <section className="lg:col-span-2 ledger-board bg-[var(--surface)]">
              <div className="bg-[var(--surface-2)] border-b border-[var(--border)] px-5 py-3">
                <h2 className="font-display font-bold text-sm uppercase tracking-wide text-[var(--ink)]">
                  PUBLISH NEW CIRCULAR
                </h2>
              </div>

              <div className="p-5">
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                  <div>
                    <label htmlFor="notice-title" className="utility-caps text-[10px] block mb-2 text-[var(--ink)] opacity-80">
                      Notice Heading / Title *
                    </label>
                    <input
                      id="notice-title"
                      type="text"
                      required
                      placeholder="E.g. SCHEDULED ELEVATOR POWER CUT"
                      className="input-minimal"
                      value={title}
                      onChange={(e) => {
                        setTitle(e.target.value);
                        if (e.target.value) setTitleError("");
                      }}
                    />
                    {titleError && (
                      <p className="font-utility text-[10px] text-[var(--status-open)] mt-1.5 flex items-center gap-1">
                        <AlertCircle size={10} />
                        {titleError}
                      </p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="notice-body" className="utility-caps text-[10px] block mb-2 text-[var(--ink)] opacity-80">
                      Notice Content / Body *
                    </label>
                    <textarea
                      id="notice-body"
                      required
                      rows={6}
                      placeholder="ENTER OFFICIAL BULLETIN INFORMATION IN DETAIL..."
                      className="input-minimal font-body text-xs resize-none"
                      value={body}
                      onChange={(e) => {
                        setBody(e.target.value);
                        if (e.target.value) setBodyError("");
                      }}
                    />
                    {bodyError && (
                      <p className="font-utility text-[10px] text-[var(--status-open)] mt-1.5 flex items-center gap-1">
                        <AlertCircle size={10} />
                        {bodyError}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-3 py-1">
                    <input
                      id="notice-important"
                      type="checkbox"
                      className="accent-[var(--accent)] h-4 w-4 cursor-pointer rounded-[4px]"
                      checked={isImportant}
                      onChange={(e) => setIsImportant(e.target.checked)}
                    />
                    <label htmlFor="notice-important" className="utility-caps text-[10px] text-[var(--ink-muted)] select-none cursor-pointer">
                      PIN TO BULLETIN BOARD (IMPORTANT NOTICE)
                    </label>
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="btn-minimal w-full mt-2 disabled:opacity-50 rounded-[6px]"
                  >
                    {submitting ? "PUBLISHING..." : "PUBLISH OFFICIAL BULLETIN"}
                  </button>
                </form>
              </div>
            </section>

            {/* Right List: Notices Register */}
            <section className="lg:col-span-3 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h2 className="font-display font-bold text-xl uppercase tracking-tight text-[var(--ink)]">
                  ACTIVE BULLETIN REGISTER
                </h2>
                <span className="font-utility text-[10px] text-[var(--ink-muted)] border border-[var(--border)] px-2 py-1 rounded-[6px]">
                  {notices.length} {notices.length === 1 ? "CIRCULAR" : "CIRCULARS"}
                </span>
              </div>

              <div className="ledger-board">
                {/* Table Header */}
                <div className="grid grid-cols-4 border-b border-[var(--border)] bg-[var(--surface-2)] px-5 py-2.5 font-utility text-xs font-semibold tracking-wider text-[var(--ink-muted)]">
                  <span className="col-span-2">CIRCULAR HEADLINE</span>
                  <span>DATE</span>
                  <span className="text-right">ACTION</span>
                </div>

                {notices.length === 0 ? (
                  <div className="p-8 text-center bg-[var(--surface)] flex flex-col items-center gap-4">
                    <Megaphone className="w-10 h-10 text-[var(--ink-muted)] opacity-50" />
                    <div>
                      <p className="font-utility text-xs text-[var(--ink)] uppercase font-semibold tracking-wider">
                        NO ACTIVE NOTICES
                      </p>
                      <p className="font-body text-xs text-[var(--ink-muted)] mt-1">
                        There are no announcements in the circular register archive.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="divide-y divide-[var(--border)] bg-[var(--surface)]">
                    {notices.map((n) => (
                      <div key={n.id} className="grid grid-cols-4 px-5 py-4 items-center hover:bg-[var(--surface-2)] transition-colors">
                        {/* Notice details */}
                        <div className="col-span-2 pr-4">
                          <div className="flex gap-2 items-center mb-1 flex-wrap">
                            {n.is_important && (
                              <span className="font-utility text-[8px] font-bold tracking-wider px-1.5 py-0.5 bg-[var(--status-open)] text-white rounded-[4px] flex items-center gap-1">
                                <Pin size={8} />
                                PINNED
                              </span>
                            )}
                            <span className="font-utility text-[9px] text-[var(--ink-muted)] opacity-60">
                              REF: {n.id.substring(0, 8)}
                            </span>
                          </div>
                          <h3 className="font-display font-bold text-xs text-[var(--ink)] uppercase leading-tight line-clamp-1">
                            {n.title}
                          </h3>
                          <p className="font-body text-[10px] text-[var(--ink-muted)] mt-1 line-clamp-1">
                            {n.body}
                          </p>
                        </div>

                        {/* Date */}
                        <div className="font-utility text-xs text-[var(--ink-muted)]">
                          {fmtDate(n.created_at)}
                        </div>

                        {/* Action */}
                        <div className="text-right">
                          <button
                            onClick={() => setDeleteNoticeId(n.id)}
                            className="font-utility text-[9px] font-semibold text-[var(--status-open)] hover:underline tracking-wider flex items-center gap-1 justify-end ml-auto"
                          >
                            <Trash2 size={10} />
                            [REMOVE]
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          </div>
        )}

        {/* Footer copyright */}
        <footer className="border-t border-[var(--border)] pt-8 text-center text-xs font-utility text-[var(--ink-muted)]">
          <p>© 2026 SOCIETY-FIX. PUBLIC COMMUNITY ANNOUNCEMENTS OFFICE.</p>
        </footer>
      </main>
    </>
  );
}
