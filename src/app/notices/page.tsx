"use client";

import { useState, useEffect } from "react";
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

export default function NoticeBoard() {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSessionAndNotices = async () => {
      const supabase = createClient();
      
      // Load user details
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();
        
        setUserRole(profile?.role || "resident");
      }

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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center font-utility text-xs">
        <span className="opacity-50 tracking-widest animate-pulse">LOADING BULLETIN BOARD...</span>
      </div>
    );
  }

  return (
    <main className="min-h-screen py-12 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto flex flex-col justify-between">
      {/* Top Header */}
      <header className="border-b border-[var(--border)] pb-6 mb-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <span className="utility-caps text-[var(--accent)] font-semibold tracking-widest text-xs">
            PUBLIC NOTICE BOARD
          </span>
          <h1 className="text-3xl font-bold tracking-tight text-[var(--ink)]">
            COMMUNITY REGISTER BOARD
          </h1>
        </div>
        
        <div className="flex gap-3">
          {userRole === "admin" ? (
            <Link 
              href="/admin"
              className="btn-minimal text-xs py-2 px-4"
            >
              ← RETURN TO JOURNAL
            </Link>
          ) : userRole === "resident" ? (
            <Link 
              href="/dashboard"
              className="btn-minimal text-xs py-2 px-4"
            >
              ← RETURN TO LOG
            </Link>
          ) : (
            <Link 
              href="/login"
              className="btn-minimal text-xs py-2 px-4"
            >
              PORTAL LOGIN
            </Link>
          )}
          
          <Link 
            href="/"
            className="btn-minimal-secondary text-xs py-2 px-4"
          >
            SOCIETY DIRECTORY
          </Link>
        </div>
      </header>

      {/* Corkboard Container */}
      <div className="corkboard mb-12">
        {/* Pinned Notices Section */}
        {pinnedNotices.length > 0 && (
          <div className="mb-12">
            <h2 className="font-utility text-xs text-[#FFFDF0] opacity-80 uppercase tracking-widest border-b border-[#FFFDF0]/20 pb-2 mb-8 font-bold">
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
                      <span className="font-utility text-[10px] font-bold text-[var(--status-open)] uppercase tracking-wider">
                        CRITICAL BULLETIN
                      </span>
                      <span className="font-utility text-[10px] text-[var(--ink)] opacity-60">
                        {fmtDate(notice.created_at)}
                      </span>
                    </div>
                    
                    <h3 className="text-base font-bold font-display text-[var(--ink)] mb-2 leading-tight">
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
          <h2 className="font-utility text-xs text-[#FFFDF0] opacity-80 uppercase tracking-widest border-b border-[#FFFDF0]/20 pb-2 mb-6 font-bold">
            GENERAL CIRCULARS & NOTICES
          </h2>
          
          {regularNotices.length === 0 && pinnedNotices.length === 0 ? (
            <div className="p-8 text-center bg-white/5 rounded border border-dashed border-white/10">
              <p className="font-utility text-xs text-[#FFFDF0] opacity-60">NO RESIDENT CIRCULARS POSTED.</p>
            </div>
          ) : regularNotices.length === 0 ? (
            <div className="p-8 text-center bg-white/5 rounded border border-dashed border-white/10">
              <p className="font-utility text-xs text-[#FFFDF0] opacity-60">ALL RELEVANT ISSUES PINNED TO BULLETIN ABOVE.</p>
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
                    <span className="font-utility text-[9px] font-semibold text-[var(--accent)] tracking-wider">
                      GENERAL NOTICE
                    </span>
                    <span className="font-utility text-[9px] text-[var(--ink)] opacity-50">
                      {fmtDate(notice.created_at)}
                    </span>
                  </div>
                  
                  <h3 className="text-sm font-bold font-display text-[var(--ink)] mb-2 leading-tight">
                    {notice.title}
                  </h3>
                  
                  <p className="font-body text-xs text-[var(--ink)] opacity-85 leading-relaxed mb-3 whitespace-pre-wrap">
                    {notice.body}
                  </p>
                  
                  <div className="flex justify-between items-center text-[9px] font-utility text-[var(--ink)] opacity-40 border-t border-dashed border-[var(--border)] pt-2 mt-1">
                    <span>REF: {notice.id.substring(0, 8)}</span>
                    <span>BY: {notice.author}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer copyright */}
      <footer className="border-t border-[var(--border)] pt-8 text-center text-xs font-utility text-[var(--ink)] opacity-60">
        <p>© 2026 SOCIETY-FIX. PUBLIC COMMUNITY ANNOUNCEMENTS OFFICE.</p>
      </footer>
    </main>
  );
}
