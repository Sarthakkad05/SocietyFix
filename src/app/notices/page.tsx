"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import Navigation from "@/app/components/Navigation";
import { Skeleton } from "@/app/components/Skeleton";
import { Pin, Megaphone, Inbox } from "lucide-react";

interface Notice {
  id: string;
  title: string;
  body: string;
  is_important: boolean;
  created_at: string;
  author: string;
}

export default function NoticeBoard() {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSessionAndNotices = async () => {
      const supabase = createClient();
      
      // Load notices from Supabase sorted by is_important desc, then created_at desc
      const { data, error } = await supabase
        .from("notices")
        .select("*")
        .order("is_important", { ascending: false })
        .order("created_at", { ascending: false });

      if (!error && data) {
        setNotices(data as Notice[]);
      }
      setLoading(false);
    };

    loadSessionAndNotices();
  }, []);

  const pinnedNotices = notices.filter((n) => n.is_important);
  const regularNotices = notices.filter((n) => !n.is_important);

  const getRotation = (id: string) => {
    const rotations = ["-1.5deg", "1.2deg", "-0.8deg", "2deg", "-2deg", "0.5deg"];
    const index = id.charCodeAt(id.length - 1) % rotations.length;
    return rotations[index];
  };

  const fmtDate = (iso: string) => {
    return new Date(iso).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <>
      <Navigation />
      <main className="min-h-[calc(100vh-64px)] py-12 px-4 md:px-6 max-w-[1280px] mx-auto flex flex-col gap-12">
        {/* Top Header */}
        <header className="border-b border-[var(--border)] pb-6 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <span className="utility-caps text-[var(--accent)] font-semibold tracking-widest text-xs">
              PUBLIC NOTICE BOARD
            </span>
            <h1 className="text-3xl font-bold tracking-tight text-[var(--ink)] mt-1">
              COMMUNITY REGISTER BOARD
            </h1>
          </div>
        </header>

        {loading ? (
          <div className="flex flex-col gap-6 animate-pulse">
            <Skeleton className="h-6 w-1/4" />
            <div className="corkboard flex flex-col gap-8">
              <Skeleton className="h-40 w-full rounded-[6px]" />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Skeleton className="h-44 w-full rounded-[6px]" />
                <Skeleton className="h-44 w-full rounded-[6px]" />
                <Skeleton className="h-44 w-full rounded-[6px]" />
              </div>
            </div>
          </div>
        ) : (
          /* Corkboard Container */
          <div className="corkboard mb-8">
            {/* Pinned Notices Section */}
            {pinnedNotices.length > 0 && (
              <div className="mb-12">
                <h2 className="font-utility text-xs text-[var(--ink)] opacity-80 uppercase tracking-widest border-b border-[var(--border)] pb-2 mb-8 font-bold flex items-center gap-2">
                  <Pin size={12} className="text-[var(--accent)]" />
                  ★ CRITICAL BULLETIN BOARD (PINNED)
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {pinnedNotices.map((notice, index) => {
                    const rot = getRotation(notice.id);
                    return (
                      <div
                        key={notice.id}
                        className="notice-pinned slide-in-notice"
                        style={{ 
                          transform: `rotate(${rot})`,
                          animationDelay: `${index * 100}ms`
                        }}
                      >
                        <div className="flex justify-between items-start mb-3 border-b border-[var(--border)] pb-2">
                          <span className="font-utility text-[10px] font-bold text-[var(--status-open)] uppercase tracking-wider flex items-center gap-1">
                            <Pin size={10} />
                            CRITICAL BULLETIN
                          </span>
                          <span className="font-utility text-[10px] text-[var(--ink)] opacity-60">
                            {fmtDate(notice.created_at)}
                          </span>
                        </div>
                        
                        <h3 className="text-base font-bold font-display text-[var(--ink)] mb-2 leading-tight uppercase">
                          {notice.title}
                        </h3>
                        
                        <p className="font-body text-xs text-[var(--ink)] opacity-90 leading-relaxed mb-4 whitespace-pre-wrap">
                          {notice.body}
                        </p>
                        
                        <div className="flex justify-between items-center text-[9px] font-utility text-[var(--ink)] opacity-50 border-t border-dashed border-[var(--border)] pt-2">
                          <span>REF: {notice.id.substring(0, 8)}</span>
                          <span>BY: {notice.author}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Regular Notices Section */}
            <div>
              <h2 className="font-utility text-xs text-[var(--ink)] opacity-80 uppercase tracking-widest border-b border-[var(--border)] pb-2 mb-6 font-bold flex items-center gap-2">
                <Megaphone size={12} className="text-[var(--ink-muted)]" />
                GENERAL CIRCULARS & NOTICES
              </h2>
              
              {regularNotices.length === 0 && pinnedNotices.length === 0 ? (
                <div className="p-8 text-center bg-white/5 rounded-[6px] border border-dashed border-white/10 flex flex-col items-center gap-4">
                  <Inbox className="w-10 h-10 text-white opacity-40" />
                  <div>
                    <p className="font-utility text-xs text-[var(--ink)] uppercase font-bold tracking-wider">
                      NO RESIDENT CIRCULARS POSTED
                    </p>
                    <p className="font-body text-xs text-[var(--ink-muted)] mt-1 max-w-sm mx-auto">
                      The bulletin board is empty. There are no announcements or community letters logged currently.
                    </p>
                  </div>
                </div>
              ) : regularNotices.length === 0 ? (
                <div className="p-8 text-center bg-white/5 rounded-[6px] border border-dashed border-white/10 flex flex-col items-center gap-4">
                  <Pin className="w-10 h-10 text-[var(--accent)] opacity-40" />
                  <div>
                    <p className="font-utility text-xs text-[var(--ink)] uppercase font-bold tracking-wider">
                      ALL RELEVANT ISSUES PINNED TO BULLETIN ABOVE
                    </p>
                    <p className="font-body text-xs text-[var(--ink-muted)] mt-1 max-w-sm mx-auto">
                      All active announcements are currently marked critical and pinned at the top of the corkboard.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {regularNotices.map((notice, index) => (
                    <div
                      key={notice.id}
                      className="notice-regular slide-in-notice"
                      style={{ 
                        animationDelay: `${(index + pinnedNotices.length) * 100}ms`
                      }}
                    >
                      <div className="flex justify-between items-center mb-2.5 border-b border-[var(--border)] pb-2">
                        <span className="font-utility text-[9px] font-semibold text-[var(--accent)] tracking-wider uppercase">
                          GENERAL NOTICE
                        </span>
                        <span className="font-utility text-[9px] text-[var(--ink-muted)]">
                          {fmtDate(notice.created_at)}
                        </span>
                      </div>
                      
                      <h3 className="text-sm font-bold font-display text-[var(--ink)] mb-2 leading-tight uppercase">
                        {notice.title}
                      </h3>
                      
                      <p className="font-body text-xs text-[var(--ink-muted)] leading-relaxed mb-3 whitespace-pre-wrap">
                        {notice.body}
                      </p>
                      
                      <div className="flex justify-between items-center text-[9px] font-utility text-[var(--ink-muted)] opacity-60 border-t border-dashed border-[var(--border)] pt-2 mt-1">
                        <span>REF: {notice.id.substring(0, 8)}</span>
                        <span>BY: {notice.author}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
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
