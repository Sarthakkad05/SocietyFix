import Link from "next/link";

export default function Home() {
  // Mock directory list representing apartments
  const directory = [
    { floor: "04", unit: "A-401", status: "RESIDENT" },
    { floor: "04", unit: "A-402", status: "VACANT" },
    { floor: "03", unit: "B-301", status: "RESIDENT" },
    { floor: "03", unit: "B-302", status: "RESIDENT" },
    { floor: "02", unit: "C-201", status: "VACANT" },
    { floor: "02", unit: "C-202", status: "RESIDENT" },
    { floor: "01", unit: "D-101", status: "RESIDENT" },
    { floor: "01", unit: "D-102", status: "ADMIN" },
  ];

  return (
    <main className="min-h-screen py-16 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto flex flex-col justify-between">
      {/* Top Header info */}
      <header className="border-b border-[var(--border)] pb-8 mb-12 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <span className="utility-caps text-[var(--accent)] font-semibold tracking-widest block mb-2">
            MUNICIPAL RESIDENT REGISTER
          </span>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-[var(--ink)]">
            SOCIETY-FIX
          </h1>
        </div>
        <div className="font-utility text-xs text-right text-[var(--ink)] opacity-70">
          <p>LATITUDE: 19.0760° N</p>
          <p>LONGITUDE: 72.8777° E</p>
          <p>REGISTER NO: SF-2026-09</p>
        </div>
      </header>

      {/* Main Directory grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start mb-16">
        
        {/* Left Columns: Directory Board */}
        <section className="lg:col-span-2 ledger-board">
          <div className="bg-[var(--ink)] text-[var(--bg)] px-5 py-4 font-display font-bold text-lg tracking-wide uppercase">
            BUILDING DIRECTORY REGISTER
          </div>
          <div className="grid grid-cols-3 border-b-2 border-[var(--ink)] bg-[var(--bg)] px-5 py-2 font-utility text-xs font-semibold tracking-wider">
            <span>FLOOR</span>
            <span>UNIT NO.</span>
            <span className="text-right">REGISTRATION</span>
          </div>
          <div className="divide-y divide-[var(--border)]">
            {directory.map((item) => (
              <div
                key={item.unit}
                className="grid grid-cols-3 px-5 py-3.5 items-center hover:bg-[#fafafa] transition-colors"
              >
                <span className="font-utility text-sm text-[var(--ink)] opacity-60">
                  {item.floor}
                </span>
                <span className="font-utility font-bold text-sm tracking-tight text-[var(--ink)]">
                  {item.unit}
                </span>
                <span className="text-right">
                  <span
                    className={`font-utility text-[10px] font-bold tracking-wider px-2 py-0.5 border ${
                      item.status === "VACANT"
                        ? "border-[var(--border)] text-[var(--ink)] opacity-40"
                        : item.status === "ADMIN"
                        ? "border-[var(--accent)] text-[var(--accent)]"
                        : "border-[var(--ink)] text-[var(--ink)]"
                    }`}
                  >
                    {item.status}
                  </span>
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Right Column: Portal Entry Controls */}
        <section className="flex flex-col gap-6">
          <div className="ledger-board p-6 bg-[var(--surface)] flex flex-col gap-6">
            <h2 className="text-xl font-bold border-b border-[var(--border)] pb-3 text-[var(--ink)]">
              PORTAL SELECTION
            </h2>
            
            <p className="text-sm text-[var(--ink)] opacity-80 leading-relaxed font-body">
              Welcome to the digital ledger registry. Please select your designation or view community notices.
            </p>

            <div className="flex flex-col gap-3">
              <Link 
                href="/login"
                className="btn-minimal text-center w-full block hover:bg-transparent"
              >
                Resident Portal
              </Link>
              
              <Link 
                href="/login"
                className="btn-minimal btn-minimal-accent text-center w-full block hover:bg-transparent"
              >
                Administrator Board
              </Link>

              <Link 
                href="/notices"
                className="btn-minimal-secondary text-center w-full block"
              >
                Notice Board (Corkboard)
              </Link>
            </div>
          </div>

          {/* Quick Stats / Info Tab */}
          <div className="ledger-tab ledger-tab--accent">
            <span className="utility-caps text-xs block mb-1 text-[var(--accent)] font-semibold">
              SYSTEM STATUS
            </span>
            <div className="font-utility font-bold text-lg text-[var(--ink)]">
              ACTIVE REGISTER
            </div>
            <p className="text-xs text-[var(--ink)] opacity-70 mt-2 font-body">
              All complaints are resolved under municipal bylaws. Live sync with localStorage enabled.
            </p>
          </div>
        </section>
      </div>

      {/* Footer copyright */}
      <footer className="border-t border-[var(--border)] pt-8 text-center text-xs font-utility text-[var(--ink)] opacity-60">
        <p>© 2026 SOCIETY-FIX. ALL RIGHTS RESERVED. SECURE LEDGER SYSTEM.</p>
      </footer>
    </main>
  );
}
