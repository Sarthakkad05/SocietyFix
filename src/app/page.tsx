import Link from "next/link";
import { createAdminClient } from "@/utils/supabase/admin";
import Navigation from "@/app/components/Navigation";

export default async function Home() {
  const supabase = createAdminClient();
  const { data: profiles } = await supabase
    .from("profiles")
    .select("apartment_no, role");

  const dbProfiles = profiles || [];

  const directory = dbProfiles
    .filter((p) => p.apartment_no)
    .map((p) => {
      // Determine floor from unit digits (e.g. A-402 -> floor 04, B-301 -> floor 03)
      let floorStr = "01";
      const digitsMatch = p.apartment_no.match(/\d+/);
      if (digitsMatch) {
        const digits = digitsMatch[0];
        if (digits.length >= 3) {
          floorStr = String(digits.substring(0, digits.length - 2)).padStart(2, "0");
        } else if (digits.length > 0) {
          floorStr = String(digits[0]).padStart(2, "0");
        }
      }

      return {
        floor: floorStr,
        unit: p.apartment_no.toUpperCase(),
        status: p.role.toUpperCase(),
      };
    })
    .sort((a, b) => {
      if (b.floor !== a.floor) {
        return b.floor.localeCompare(a.floor);
      }
      return a.unit.localeCompare(b.unit);
    });

  return (
    <>
      <Navigation />
      <main className="min-h-[calc(100vh-64px)] py-12 px-4 md:px-6 max-w-[1280px] mx-auto flex flex-col justify-between gap-12">
        {/* Top Header info */}
        <header className="border-b border-[var(--border)] pb-6 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <span className="utility-caps text-[var(--ink-muted)] font-semibold tracking-widest block mb-2">
              MUNICIPAL RESIDENT REGISTER
            </span>
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-[var(--ink)]">
              SOCIETY-FIX
            </h1>
          </div>
        </header>

        {/* Main Directory grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start mb-8">
          {/* Left Column: Portal Entry Controls */}
          <section className="flex flex-col gap-6">
            <div className="ledger-board p-6 bg-[var(--surface)] flex flex-col gap-6">
              <h2 className="text-xl font-bold border-b border-[var(--border)] pb-3 text-[var(--ink)]">
                PORTAL SELECTION
              </h2>

              <p className="text-sm text-[var(--ink-muted)] leading-relaxed font-body">
                Welcome to the digital ledger registry. Please select your designation or view community notices.
              </p>

              <div className="flex flex-col gap-4">
                <Link
                  href="/login"
                  className="btn-minimal text-center w-full block rounded-[6px]"
                >
                  Resident Portal
                </Link>

                <Link
                  href="/login"
                  className="btn-minimal btn-minimal-accent text-center w-full block rounded-[6px]"
                >
                  Administrator Board
                </Link>

                <Link
                  href="/notices"
                  className="btn-minimal-secondary text-center w-full block rounded-[6px]"
                >
                  Notice Board (Corkboard)
                </Link>
              </div>
            </div>
          </section>

          {/* Right Columns: Directory Board */}
          <section className="lg:col-span-2 ledger-board bg-[var(--surface)]">
            <div className="bg-[var(--surface-2)] border-b border-[var(--border)] px-5 py-4 font-display font-bold text-lg tracking-wide uppercase text-[var(--ink)]">
              BUILDING DIRECTORY REGISTER
            </div>
            <div className="grid grid-cols-3 border-b border-[var(--border)] bg-[var(--surface-2)] px-5 py-2 font-utility text-xs font-semibold tracking-wider text-[var(--ink-muted)]">
              <span>FLOOR</span>
              <span>UNIT NO.</span>
              <span className="text-right">REGISTRATION</span>
            </div>
            <div className="divide-y divide-[var(--border)]">
              {directory.length === 0 ? (
                <div className="px-5 py-8 text-center font-utility text-xs text-[var(--ink-muted)] uppercase">
                  NO REGISTERED DIRECTORIES FOUND IN JOURNAL
                </div>
              ) : (
                directory.map((item) => (
                  <div
                    key={item.unit}
                    className="grid grid-cols-3 px-5 py-4 items-center hover:bg-[var(--surface-2)] transition-colors"
                  >
                    <span className="font-utility text-sm text-[var(--ink-muted)]">
                      {item.floor}
                    </span>
                    <span className="font-utility font-bold text-sm tracking-tight text-[var(--ink)]">
                      {item.unit}
                    </span>
                    <span className="text-right">
                      <span
                        className={`font-utility text-[10px] font-bold tracking-wider px-2 py-0.5 border rounded-[6px] ${
                          item.status === "ADMIN"
                            ? "border-[var(--ink)] text-[var(--ink)]"
                            : "border-[var(--border)] text-[var(--ink-muted)]"
                        }`}
                      >
                        {item.status}
                      </span>
                    </span>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>

        {/* Footer copyright */}
        <footer className="border-t border-[var(--border)] pt-8 text-center text-xs font-utility text-[var(--ink-muted)]">
          <p>© 2026 SOCIETY-FIX. ALL RIGHTS RESERVED. SECURE LEDGER SYSTEM.</p>
        </footer>
      </main>
    </>
  );
}
