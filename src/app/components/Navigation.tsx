"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { Menu, X, LogOut, Sun, Moon } from "lucide-react";

interface UserProfile {
  id: string;
  full_name: string;
  role: string;
  apartment_no: string | null;
}

// ─── Theme Toggle Button ───────────────────────────────────────────────────────
function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);

  // On mount, read persisted preference — default is light
  useEffect(() => {
    const saved = localStorage.getItem("sf-theme");
    const dark = saved === "dark"; // only dark if explicitly saved as "dark"
    setIsDark(dark);
    document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
  }, []);

  const toggle = () => {
    const next = !isDark;
    setIsDark(next);
    const theme = next ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("sf-theme", theme);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className="flex items-center justify-center w-8 h-8 rounded-[6px] border border-[var(--border)] bg-[var(--surface-2)] text-[var(--ink-muted)] hover:text-[var(--accent)] hover:border-[var(--accent)] transition-all duration-200"
    >
      {isDark
        ? <Sun size={14} className="transition-transform duration-300" />
        : <Moon size={14} className="transition-transform duration-300" />
      }
    </button>
  );
}

export default function Navigation() {
  const pathname = usePathname();
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: prof } = await supabase
            .from("profiles")
            .select("id, full_name, role, apartment_no")
            .eq("id", user.id)
            .single();
          if (prof) {
            setProfile(prof as UserProfile);
          }
        }
      } catch (err) {
        console.error("Navigation auth error:", err);
      }
    };
    fetchUser();
  }, [pathname]);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setProfile(null);
    router.push("/login");
    router.refresh();
  };

  const isAdmin = profile?.role === "admin";
  const isResident = profile?.role === "resident";

  const links = [];
  if (profile) {
    if (isAdmin) {
      links.push({ href: "/admin", label: "MASTER JOURNAL" });
      links.push({ href: "/admin/notices", label: "CIRCULAR JOURNAL" });
    } else if (isResident) {
      links.push({ href: "/dashboard", label: "MY COMPLAINTS" });
    }
    links.push({ href: "/notices", label: "CORKBOARD" });
  } else {
    links.push({ href: "/", label: "DIRECTORY" });
    links.push({ href: "/notices", label: "CORKBOARD" });
    links.push({ href: "/login", label: "ACCESS PORTAL" });
  }

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <nav className="sticky top-0 z-40 w-full border-b border-[var(--border)] bg-[var(--surface)]/80 backdrop-blur-md">
      <div className="max-w-[1280px] mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
        {/* Brand / Logo */}
        <div className="flex items-center gap-2">
          <Link href={profile ? (isAdmin ? "/admin" : "/dashboard") : "/"} className="flex items-center gap-2">
            <span className="font-display font-bold text-xl tracking-tight text-[var(--ink)]">
              SOCIETY<span className="text-[var(--accent)] font-semibold">-FIX</span>
            </span>
          </Link>
          {profile && (
            <span className="hidden sm:inline-block font-utility text-[10px] font-bold px-2 py-0.5 border border-[var(--ink)] bg-[var(--ink)] text-[var(--bg)] rounded-[6px]">
              {profile.apartment_no || profile.role.toUpperCase()}
            </span>
          )}
        </div>

        {/* Desktop Links */}
        <div className="hidden md:flex items-center gap-6">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`font-utility text-xs tracking-wider transition-colors py-1 ${
                isActive(link.href)
                  ? "text-[var(--accent)] border-b-2 border-[var(--accent)] font-bold"
                  : "text-[var(--ink-muted)] hover:text-[var(--ink)]"
              }`}
            >
              {link.label}
            </Link>
          ))}

          {/* Theme Toggle */}
          <ThemeToggle />

          {profile && (
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 font-utility text-xs text-[var(--status-open)] hover:underline"
            >
              <LogOut size={13} />
              EXIT
            </button>
          )}
        </div>

        {/* Mobile menu trigger */}
        <div className="md:hidden flex items-center gap-3">
          <ThemeToggle />
          {profile && (
            <button
              onClick={handleLogout}
              className="font-utility text-xs text-[var(--status-open)] hover:underline flex items-center gap-1"
              aria-label="Logout"
            >
              <LogOut size={13} />
            </button>
          )}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="text-[var(--ink)] hover:text-[var(--accent)] transition-colors p-1"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 top-16 z-30 bg-black/60 md:hidden animate-in fade-in duration-200">
          <div className="w-64 bg-[var(--surface)] border-l border-[var(--border)] h-full ml-auto p-6 flex flex-col gap-6 animate-in slide-in-from-right duration-200">
            <div className="flex flex-col gap-4">
              <span className="font-utility text-[10px] text-[var(--ink-muted)] tracking-widest uppercase border-b border-[var(--border)] pb-2">
                NAVIGATION REGISTER
              </span>
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`font-utility text-sm tracking-wider block py-1.5 ${
                    isActive(link.href)
                      ? "text-[var(--accent)] font-bold border-l-2 border-[var(--accent)] pl-2"
                      : "text-[var(--ink-muted)] hover:text-[var(--ink)] pl-2"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </div>

            {profile && (
              <div className="mt-auto pt-6 border-t border-[var(--border)] flex flex-col gap-3">
                <div className="font-body text-xs text-[var(--ink-muted)]">
                  USER: {profile.full_name}
                </div>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleLogout();
                  }}
                  className="btn-minimal-secondary w-full text-xs text-center flex items-center justify-center gap-2"
                >
                  <LogOut size={14} />
                  SIGN OUT
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
