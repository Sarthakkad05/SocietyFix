import Link from "next/link";
import Image from "next/image";
import Navigation from "@/app/components/Navigation";

export default async function Home() {

  return (
    <>
      <Navigation />

      {/* ── HERO ──────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-b border-[var(--border)]">
        {/* Subtle dot grid background */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: "radial-gradient(circle, var(--border) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
            opacity: 0.4,
          }}
          aria-hidden="true"
        />

        <div className="max-w-[1280px] mx-auto px-4 md:px-6 py-20 md:py-28 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center relative z-10">

          {/* ── Left: Copy + CTAs ── */}
          <div className="flex flex-col items-start gap-8">
            {/* Badge */}
            <span className="font-utility text-[10px] tracking-[0.2em] uppercase border border-[var(--accent)] text-[var(--accent)] px-3 py-1 rounded-[6px] bg-[var(--accent)]/10">
              Society Management Platform
            </span>

            <div>
              <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight text-[var(--ink)] leading-[1.02]">
                SOCIETY-FIX
              </h1>
              <p className="mt-4 text-base md:text-lg font-body text-[var(--ink-muted)] leading-relaxed max-w-md">
                A disciplined, ledger-style complaint management system for modern
                residential societies. File, track, and resolve issues with the
                precision of a government register.
              </p>
            </div>

            {/* Stacked CTAs */}
            <div className="flex flex-col gap-2.5 w-full max-w-[280px]">
              <Link href="/login" className="btn-minimal rounded-[6px] px-6 py-3 text-sm text-center w-full">
                Resident Portal →
              </Link>
              <Link href="/login" className="btn-minimal-secondary rounded-[6px] px-6 py-3 text-sm text-center w-full">
                Administrator Board →
              </Link>
              <Link href="/notices" className="text-center font-utility text-[10px] tracking-wider text-[var(--ink-muted)] hover:text-[var(--accent)] transition-colors pt-1">
                View Public Notice Board ↗
              </Link>
            </div>

            {/* Stats — fixed 4-col grid, no wrapping */}
            <div className="grid grid-cols-4 gap-0 border border-[var(--border)] rounded-[6px] overflow-hidden w-full">
              {[
                { label: "Categories", value: "06" },
                { label: "Status Tiers", value: "03" },
                { label: "Email Alerts", value: "ON" },
                { label: "Tracking", value: "LIVE" },
              ].map((stat, i) => (
                <div
                  key={stat.label}
                  className={`flex flex-col gap-0.5 px-4 py-3 bg-[var(--surface)] ${i < 3 ? "border-r border-[var(--border)]" : ""}`}
                >
                  <span className="font-utility font-bold text-xl text-[var(--ink)]">
                    {stat.value}
                  </span>
                  <span className="font-utility text-[9px] tracking-widest text-[var(--ink-muted)] uppercase leading-tight">
                    {stat.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Right: Live Dashboard Preview Card ── */}
          <div className="hidden lg:block relative">
            {/* Glow effect behind card */}
            <div
              className="absolute -inset-4 rounded-2xl pointer-events-none"
              style={{ background: "radial-gradient(ellipse at center, rgba(59,111,224,0.08) 0%, transparent 70%)" }}
              aria-hidden="true"
            />

            <div className="ledger-board bg-[var(--surface)] overflow-hidden shadow-2xl relative">
              {/* Card header */}
              <div className="bg-[var(--surface-2)] border-b border-[var(--border)] px-5 py-3.5 flex items-center justify-between">
                <div>
                  <p className="font-utility text-[9px] tracking-[0.15em] text-[var(--ink-muted)] uppercase">Administrator Board Register</p>
                  <p className="font-display font-bold text-sm text-[var(--ink)] mt-0.5 tracking-wide">COMPLAINTS MASTER LEDGER</p>
                </div>
                <div className="flex items-center gap-2 bg-[var(--status-resolved)]/10 border border-[var(--status-resolved)]/30 px-2.5 py-1 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--status-resolved)] animate-pulse" />
                  <span className="font-utility text-[9px] text-[var(--status-resolved)] tracking-wider font-bold">LIVE</span>
                </div>
              </div>

              {/* Stat mini blocks with colored top borders */}
              <div className="grid grid-cols-4 border-b border-[var(--border)]">
                {[
                  { label: "TOTAL", value: "08", color: "var(--ink)", border: "var(--ink-muted)" },
                  { label: "OPEN", value: "05", color: "var(--status-open)", border: "var(--status-open)" },
                  { label: "PROGRESS", value: "01", color: "var(--status-progress)", border: "var(--status-progress)" },
                  { label: "RESOLVED", value: "02", color: "var(--status-resolved)", border: "var(--status-resolved)" },
                ].map((s) => (
                  <div
                    key={s.label}
                    className="px-4 py-3 border-r border-[var(--border)] last:border-r-0"
                    style={{ borderTop: `3px solid ${s.border}` }}
                  >
                    <p className="font-utility text-[8px] tracking-widest uppercase" style={{ color: s.color }}>{s.label}</p>
                    <p className="font-utility font-bold text-2xl mt-1 leading-none" style={{ color: s.color }}>{s.value}</p>
                  </div>
                ))}
              </div>

              {/* Column headers */}
              <div className="grid grid-cols-[52px_16px_1fr_86px_76px] border-b border-[var(--border)] bg-[var(--surface-2)] px-4 py-2 font-utility text-[9px] font-semibold tracking-wider text-[var(--ink-muted)] uppercase items-center gap-2">
                <span>Unit</span>
                <span />
                <span>Category / Resident</span>
                <span>Filed</span>
                <span className="text-right">Status</span>
              </div>

              {/* Complaint rows */}
              {[
                { unit: "402", cat: "PLUMBING", resident: "Sarthak Kad", pri: "HIGH", priColor: "var(--status-open)", catColor: "var(--status-progress)", date: "14 Jul", status: "OPEN", statusColor: "var(--status-open)" },
                { unit: "301", cat: "ELECTRICAL", resident: "Rahul Mehta", pri: "MEDIUM", priColor: "var(--accent)", catColor: "var(--accent)", date: "12 Jul", status: "IN PROGRESS", statusColor: "var(--status-progress)" },
                { unit: "402", cat: "CLEANING", resident: "Sarthak Kad", pri: "LOW", priColor: "var(--ink-muted)", catColor: "var(--status-resolved)", date: "09 Jul", status: "RESOLVED", statusColor: "var(--status-resolved)" },
                { unit: "301", cat: "SECURITY", resident: "Rahul Mehta", pri: "HIGH", priColor: "var(--status-open)", catColor: "var(--status-open)", date: "09 Jul", status: "OPEN", statusColor: "var(--status-open)" },
              ].map((row, i) => (
                <div
                  key={i}
                  className="grid grid-cols-[52px_16px_1fr_86px_76px] px-4 py-3 border-b border-[var(--border)] last:border-b-0 hover:bg-[var(--surface-2)] transition-colors items-center gap-2"
                >
                  <span className="font-utility font-bold text-xs text-[var(--ink)]">{row.unit}</span>
                  {/* Category color dot */}
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: row.catColor }} />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-utility text-[10px] font-bold text-[var(--ink)]">{row.cat}</span>
                      <span
                        className="font-utility text-[7px] font-bold px-1 py-0.5 rounded-[3px]"
                        style={{ color: row.priColor, border: `1px solid ${row.priColor}`, opacity: 0.9 }}
                      >
                        {row.pri}
                      </span>
                    </div>
                    <span className="font-body text-[9px] text-[var(--ink-muted)]">{row.resident}</span>
                  </div>
                  <span className="font-utility text-[9px] text-[var(--ink-muted)]">{row.date}</span>
                  <span className="text-right">
                    <span
                      className="font-utility text-[8px] font-bold tracking-wide px-1.5 py-0.5 border rounded-[4px]"
                      style={{ color: row.statusColor, borderColor: row.statusColor, background: `color-mix(in srgb, ${row.statusColor} 10%, transparent)` }}
                    >
                      {row.status}
                    </span>
                  </span>
                </div>
              ))}

              {/* Card footer */}
              <div className="px-5 py-3 bg-[var(--surface-2)] border-t border-[var(--border)] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-utility text-[9px] text-[var(--ink-muted)] tracking-wider uppercase">Resolution Rate</span>
                  <span className="font-utility font-bold text-xs text-[var(--status-resolved)]">25%</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-32 h-1.5 bg-[var(--border)] rounded-full overflow-hidden">
                    <div className="h-full bg-[var(--status-resolved)] rounded-full" style={{ width: "25%" }} />
                  </div>
                  <span className="font-utility text-[9px] text-[var(--ink-muted)]">2/8 closed</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>



      {/* ── FEATURE SCREENSHOTS ──────────────────────────────────── */}
      <section className="py-24 px-4 md:px-6 max-w-[1280px] mx-auto">
        {/* Section header */}
        <div className="text-center mb-16">
          <span className="utility-caps text-[var(--ink-muted)] tracking-widest text-xs">
            Platform Preview
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-[var(--ink)] mt-2">
            Everything you need,{" "}
            <span className="text-[var(--accent)]">in one ledger.</span>
          </h2>
        </div>

        {/* Feature 1 — Resident Dashboard */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-24">
          <div className="flex flex-col gap-5">
            <span className="utility-caps text-[var(--accent)] text-xs tracking-widest">
              For Residents
            </span>
            <h3 className="text-2xl md:text-3xl font-bold text-[var(--ink)]">
              File complaints with precision
            </h3>
            <p className="font-body text-[var(--ink-muted)] leading-relaxed">
              Submit complaints with category, priority tier, description and
              photo evidence. Every entry gets committed to a secure ledger
              register and tracked in real-time.
            </p>
            <ul className="flex flex-col gap-2">
              {[
                "Category & priority classification",
                "Photo evidence attachment",
                "Live status timeline per complaint",
                "Rate resolution quality after close",
              ].map((item) => (
                <li key={item} className="flex items-center gap-2 font-utility text-xs text-[var(--ink-muted)]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="ledger-board overflow-hidden shadow-2xl">
            <Image
              src="/screen-resident.png"
              alt="Resident Dashboard showing complaint form and complaint log"
              width={780}
              height={520}
              className="w-full h-auto object-cover"
              priority
            />
          </div>
        </div>

        {/* Feature 2 — Admin Analytics (reversed) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-24">
          <div className="ledger-board overflow-hidden shadow-2xl order-2 lg:order-1">
            <Image
              src="/screen-admin-analytics.png"
              alt="Admin Analytics dashboard with charts"
              width={780}
              height={520}
              className="w-full h-auto object-cover"
            />
          </div>
          <div className="flex flex-col gap-5 order-1 lg:order-2">
            <span className="utility-caps text-[var(--accent)] text-xs tracking-widest">
              For Administrators
            </span>
            <h3 className="text-2xl md:text-3xl font-bold text-[var(--ink)]">
              Powerful analytics at a glance
            </h3>
            <p className="font-body text-[var(--ink-muted)] leading-relaxed">
              Track open, in-progress and resolved entries across all departments.
              Visualise complaint distribution and weekly filing trends with
              built-in charts.
            </p>
            <ul className="flex flex-col gap-2">
              {[
                "Real-time stat blocks per status",
                "Departmental distribution bar chart",
                "8-week weekly filing trend line chart",
                "Resolution rate calculation",
              ].map((item) => (
                <li key={item} className="flex items-center gap-2 font-utility text-xs text-[var(--ink-muted)]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Feature 3 — Admin Ledger */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-24">
          <div className="flex flex-col gap-5">
            <span className="utility-caps text-[var(--accent)] text-xs tracking-widest">
              Master Register
            </span>
            <h3 className="text-2xl md:text-3xl font-bold text-[var(--ink)]">
              Complaints ledger with full control
            </h3>
            <p className="font-body text-[var(--ink-muted)] leading-relaxed">
              Filter by status, category, unit or date range. Update status and
              priority on any entry. Export the filtered view as a CSV or print
              to PDF for formal records.
            </p>
            <ul className="flex flex-col gap-2">
              {[
                "Multi-field search & filter",
                "Priority & status editor per complaint",
                "Status audit timeline per entry",
                "CSV export & print-to-PDF",
              ].map((item) => (
                <li key={item} className="flex items-center gap-2 font-utility text-xs text-[var(--ink-muted)]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="ledger-board overflow-hidden shadow-2xl">
            <Image
              src="/screen-admin-ledger.png"
              alt="Admin Complaints Ledger with filter panel and master register table"
              width={780}
              height={520}
              className="w-full h-auto object-cover"
            />
          </div>
        </div>

        {/* Feature 4 — Notices + Email 2-col */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="ledger-board overflow-hidden flex flex-col">
            <div className="overflow-hidden">
              <Image
                src="/screen-notices.png"
                alt="Community Notice Board"
                width={600}
                height={340}
                className="w-full h-auto object-cover"
              />
            </div>
            <div className="p-6 flex flex-col gap-2 border-t border-[var(--border)]">
              <span className="utility-caps text-[var(--accent)] text-xs tracking-widest">
                Notice Board
              </span>
              <h3 className="text-xl font-bold text-[var(--ink)]">
                Community circulars & announcements
              </h3>
              <p className="font-body text-sm text-[var(--ink-muted)] leading-relaxed">
                Administrators post official notices and pinned circulars to the
                community board — visible to all residents publicly.
              </p>
            </div>
          </div>

          <div className="ledger-board overflow-hidden flex flex-col">
            <div className="overflow-hidden">
              <Image
                src="/screen-email.png"
                alt="Email status update notification"
                width={600}
                height={340}
                className="w-full h-auto object-cover"
              />
            </div>
            <div className="p-6 flex flex-col gap-2 border-t border-[var(--border)]">
              <span className="utility-caps text-[var(--accent)] text-xs tracking-widest">
                Email Notifications
              </span>
              <h3 className="text-xl font-bold text-[var(--ink)]">
                Residents notified instantly
              </h3>
              <p className="font-body text-sm text-[var(--ink-muted)] leading-relaxed">
                Every status change triggers a formal email with entry ref,
                department, new status and the admin&apos;s official note.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────────── */}
      <section className="py-24 px-4 md:px-6 border-t border-[var(--border)] bg-[var(--surface-2)]/50">
        <div className="max-w-[1280px] mx-auto">
          <div className="text-center mb-14">
            <span className="utility-caps text-[var(--ink-muted)] tracking-widest text-xs">
              Process
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-[var(--ink)] mt-2">
              Simple. Transparent. Accountable.
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                step: "01",
                title: "Resident Files Entry",
                desc: "Select category, priority and describe the defect. Attach photo evidence if available.",
              },
              {
                step: "02",
                title: "Committed to Ledger",
                desc: "Entry is registered instantly with a unique reference ID in the complaint register.",
              },
              {
                step: "03",
                title: "Admin Reviews & Updates",
                desc: "The superintendent reviews the entry, updates status and adds an action note.",
              },
              {
                step: "04",
                title: "Resident Notified & Rates",
                desc: "An email is dispatched on every status change. Residents rate resolution quality.",
              },
            ].map((item, idx) => (
              <div key={item.step} className="ledger-board p-6 flex flex-col gap-4 relative">
                {/* Connecting line (not for last) */}
                {idx < 3 && (
                  <div className="hidden lg:block absolute top-8 -right-3 w-6 h-px bg-[var(--border)] z-10" />
                )}
                <span className="font-utility font-bold text-4xl text-[var(--border)] leading-none">
                  {item.step}
                </span>
                <div>
                  <h3 className="font-display font-bold text-base text-[var(--ink)] mb-2">
                    {item.title}
                  </h3>
                  <p className="font-body text-sm text-[var(--ink-muted)] leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>




      {/* ── FOOTER ───────────────────────────────────────────────── */}
      <footer className="border-t border-[var(--border)] py-10 px-4 md:px-6 bg-[var(--surface-2)]/30">
        <div className="max-w-[1280px] mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-center md:text-left">
            <span className="font-display font-bold text-lg text-[var(--ink)]">SOCIETY-FIX</span>
            <p className="font-utility text-[10px] text-[var(--ink-muted)] mt-1 tracking-widest uppercase">
              Secure Ledger Management System
            </p>
          </div>
          <div className="flex gap-6 font-utility text-xs text-[var(--ink-muted)]">
            <Link href="/notices" className="hover:text-[var(--ink)] transition-colors">Notice Board</Link>
            <Link href="/login" className="hover:text-[var(--ink)] transition-colors">Sign In</Link>
            <Link href="/signup" className="hover:text-[var(--ink)] transition-colors">Register</Link>
          </div>
          <p className="font-utility text-[10px] text-[var(--ink-muted)] uppercase tracking-wider">
            © 2026 SOCIETY-FIX. All Rights Reserved.
          </p>
        </div>
      </footer>
    </>
  );
}
