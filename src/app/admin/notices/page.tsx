"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";

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
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

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
    if (!title.trim() || !body.trim()) {
      setErrorMsg("TITLE AND BODY CONTENT ARE REQUIRED.");
      return;
    }

    setSubmitting(true);
    setErrorMsg("");
    setSuccessMsg("");

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

      setSuccessMsg("NOTICE PUBLISHED SUCCESSFULLY.");
      setTitle("");
      setBody("");
      setIsImportant(false);
      await fetchNotices();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "COULD NOT RECORD NOTICE.";
      setErrorMsg(msg);
    } finally {
      setSubmitting(false);
      setTimeout(() => setSuccessMsg(""), 3500);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("ARE YOU SURE YOU WANT TO REMOVE THIS NOTICE?")) return;

    try {
      const supabase = createClient();
      const { error } = await supabase.from("notices").delete().eq("id", id);
      if (error) throw error;
      await fetchNotices();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "UNKNOWN ERROR";
      alert("FAILED TO DELETE: " + msg);
    }
  };

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center font-utility text-xs">
        <span className="opacity-50 tracking-widest animate-pulse">LOADING JOURNAL ARCHIVES...</span>
      </div>
    );
  }

  return (
    <main className="min-h-screen py-12 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto flex flex-col justify-between">
      {/* Page Header */}
      <header className="border-b border-[var(--border)] pb-6 mb-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <span className="utility-caps text-[var(--accent)] font-semibold tracking-widest text-xs">
            ADMINISTRATOR BOARD NOTICES
          </span>
          <h1 className="text-3xl font-bold tracking-tight text-[var(--ink)]">
            OFFICIAL CIRCULAR JOURNAL
          </h1>
        </div>
        <div className="flex gap-3">
          <Link href="/admin" className="btn-minimal-secondary text-xs py-2 px-4">
            ← MASTER JOURNAL
          </Link>
          <Link href="/notices" className="btn-minimal-secondary text-xs py-2 px-4">
            CORKBOARD
          </Link>
          <button onClick={handleLogout} className="btn-minimal text-xs py-2 px-4">
            SIGN OUT
          </button>
        </div>
      </header>

      {/* Grid Content */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start mb-12">
        
        {/* Left Form: Post Notice (2 span) */}
        <section className="lg:col-span-2 ledger-board bg-[var(--surface)]">
          <div className="bg-[var(--ink)] text-[var(--bg)] px-5 py-3">
            <h2 className="font-display font-bold text-sm uppercase tracking-wide">
              PUBLISH NEW CIRCULAR
            </h2>
          </div>

          <div className="p-5">
            {successMsg && (
              <div className="border border-[var(--status-resolved)] text-[var(--status-resolved)] p-3 font-utility text-[11px] mb-4 bg-[#f0fbf5]">
                {successMsg}
              </div>
            )}
            {errorMsg && (
              <div className="border border-[var(--status-open)] text-[var(--status-open)] p-3 font-utility text-[11px] mb-4 bg-[#fdf2f0]">
                ERROR: {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label htmlFor="notice-title" className="utility-caps text-[10px] block mb-1 opacity-80">
                  Notice Heading / Title *
                </label>
                <input
                  id="notice-title"
                  type="text"
                  required
                  placeholder="E.g. SCHEDULED ELEVATOR POWER CUT"
                  className="input-minimal"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div>
                <label htmlFor="notice-body" className="utility-caps text-[10px] block mb-1 opacity-80">
                  Notice Content / Body *
                </label>
                <textarea
                  id="notice-body"
                  required
                  rows={6}
                  placeholder="ENTER OFFICIAL BULLETIN INFORMATION IN DETAIL..."
                  className="input-minimal font-body text-xs resize-none"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  id="notice-important"
                  type="checkbox"
                  className="accent-[var(--accent)] h-4 w-4 cursor-pointer"
                  checked={isImportant}
                  onChange={(e) => setIsImportant(e.target.checked)}
                />
                <label htmlFor="notice-important" className="utility-caps text-[10px] select-none cursor-pointer">
                  PIN TO BULLETIN BOARD (IMPORTANT NOTICE)
                </label>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="btn-minimal w-full mt-2 disabled:opacity-50"
              >
                {submitting ? "PUBLISHING..." : "PUBLISH OFFICIAL BULLETIN"}
              </button>
            </form>
          </div>
        </section>

        {/* Right List: Notices Register (3 span) */}
        <section className="lg:col-span-3 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-bold text-xl uppercase tracking-tight text-[var(--ink)]">
              ACTIVE BULLETIN REGISTER
            </h2>
            <span className="font-utility text-[10px] text-[var(--ink)] opacity-50 border border-[var(--border)] px-2 py-1">
              {notices.length} {notices.length === 1 ? "CIRCULAR" : "CIRCULARS"}
            </span>
          </div>

          <div className="ledger-board">
            {/* Table Header */}
            <div className="grid grid-cols-4 border-b-2 border-[var(--ink)] bg-[var(--bg)] px-5 py-2 font-utility text-xs font-semibold tracking-wider">
              <span className="col-span-2">CIRCULAR HEADLINE</span>
              <span>DATE</span>
              <span className="text-right">ACTION</span>
            </div>

            {notices.length === 0 ? (
              <div className="p-8 text-center bg-[var(--surface)]">
                <p className="font-utility text-xs opacity-50">NO NOTICES IN JOURNAL ARCHIVE.</p>
              </div>
            ) : (
              <div className="divide-y divide-[var(--border)] bg-[var(--surface)]">
                {notices.map((n) => (
                  <div key={n.id} className="grid grid-cols-4 px-5 py-4 items-center hover:bg-[#FAFBF9] transition-colors">
                    {/* Notice details */}
                    <div className="col-span-2 pr-4">
                      <div className="flex gap-2 items-center mb-1 flex-wrap">
                        {n.is_important && (
                          <span className="font-utility text-[8px] font-bold tracking-wider px-1.5 py-0.5 bg-[var(--status-open)] text-white">
                            PINNED
                          </span>
                        )}
                        <span className="font-utility text-[9px] text-[var(--ink)] opacity-40">
                          REF: {n.id.substring(0, 8)}
                        </span>
                      </div>
                      <h3 className="font-display font-bold text-xs text-[var(--ink)] uppercase leading-tight line-clamp-1">
                        {n.title}
                      </h3>
                      <p className="font-body text-[10px] text-[var(--ink)] opacity-70 mt-1 line-clamp-1">
                        {n.body}
                      </p>
                    </div>

                    {/* Date */}
                    <div className="font-utility text-xs text-[var(--ink)] opacity-70">
                      {fmtDate(n.created_at)}
                    </div>

                    {/* Action */}
                    <div className="text-right">
                      <button
                        onClick={() => handleDelete(n.id)}
                        className="font-utility text-[9px] font-semibold text-[var(--status-open)] hover:underline tracking-wider"
                      >
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

      {/* Footer copyright */}
      <footer className="border-t border-[var(--border)] pt-8 text-center text-xs font-utility text-[var(--ink)] opacity-60">
        <p>© 2026 SOCIETY-FIX. PUBLIC COMMUNITY ANNOUNCEMENTS OFFICE.</p>
      </footer>
    </main>
  );
}
