"use strict";

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [wing, setWing] = useState("A");
  const [unitNum, setUnitNum] = useState("");
  const [phone, setPhone] = useState("");
  
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");
    setLoading(true);

    if (!fullName.trim() || !unitNum.trim() || !phone.trim()) {
      setError("All descriptive fields are required.");
      setLoading(false);
      return;
    }

    const apartmentNo = `${wing}-${unitNum.trim()}`;

    try {
      const supabase = createClient();
      const { data, error: signupError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: {
            full_name: fullName.trim().toUpperCase(),
            apartment_no: apartmentNo.toUpperCase(),
            phone: phone.trim(),
          },
        },
      });

      if (signupError) {
        setError(signupError.message);
        setLoading(false);
        return;
      }

      // Check if session is already active (auto-sign in enabled in Supabase)
      if (data.session) {
        router.push("/dashboard");
      } else {
        setSuccessMsg("REGISTRATION COMPLETED. PLEASE CHECK YOUR EMAIL FOR CONFIRMATION LINK OR TRY ACCESSING THE LOGIN PAGE.");
        setLoading(false);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "An unexpected error occurred.";
      setError(msg);
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen py-12 px-4 max-w-md mx-auto flex flex-col justify-center">
      {/* Header */}
      <div className="text-center mb-6">
        <Link href="/" className="utility-caps text-[var(--accent)] font-semibold tracking-widest hover:underline">
          ← BACK TO DIRECTORY
        </Link>
        <h1 className="text-3xl font-bold mt-2 text-[var(--ink)]">SOCIETY-FIX</h1>
        <p className="font-utility text-xs opacity-60 uppercase mt-1">NEW TENANT REGISTRATION</p>
      </div>

      <div className="ledger-board p-6 bg-[var(--surface)]">
        {error && (
          <div className="border border-[var(--status-open)] text-[var(--status-open)] p-3 font-utility text-xs mb-4 bg-[#fdf2f0]">
            ERROR: {error.toUpperCase()}
          </div>
        )}

        {successMsg && (
          <div className="border border-[var(--status-resolved)] text-[var(--status-resolved)] p-3 font-utility text-xs mb-4 bg-[#f0fbf5]">
            {successMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label htmlFor="reg-name" className="utility-caps text-xs block mb-1 text-[var(--ink)] opacity-80">
              Full Legal Name
            </label>
            <input
              id="reg-name"
              type="text"
              required
              className="input-minimal"
              placeholder="E.g. ALICE SMITH"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label htmlFor="reg-wing" className="utility-caps text-xs block mb-1 text-[var(--ink)] opacity-80">
                Wing
              </label>
              <select
                id="reg-wing"
                className="select-minimal"
                value={wing}
                onChange={(e) => setWing(e.target.value)}
              >
                <option value="A">A</option>
                <option value="B">B</option>
                <option value="C">C</option>
                <option value="D">D</option>
              </select>
            </div>
            <div className="col-span-2">
              <label htmlFor="reg-unit" className="utility-caps text-xs block mb-1 text-[var(--ink)] opacity-80">
                Unit / Apt No.
              </label>
              <input
                id="reg-unit"
                type="text"
                required
                pattern="[0-9]*"
                className="input-minimal font-utility"
                placeholder="E.g. 402"
                value={unitNum}
                onChange={(e) => setUnitNum(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label htmlFor="reg-phone" className="utility-caps text-xs block mb-1 text-[var(--ink)] opacity-80">
              Phone Number
            </label>
            <input
              id="reg-phone"
              type="tel"
              required
              className="input-minimal font-utility"
              placeholder="E.g. +1 555-0199"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          <div className="border-t border-dashed border-[var(--border)] my-1"></div>

          <div>
            <label htmlFor="reg-email" className="utility-caps text-xs block mb-1 text-[var(--ink)] opacity-80">
              Email Address
            </label>
            <input
              id="reg-email"
              type="email"
              required
              className="input-minimal"
              placeholder="E.g. ALICE@EMAIL.COM"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label htmlFor="reg-pass" className="utility-caps text-xs block mb-1 text-[var(--ink)] opacity-80">
              Password
            </label>
            <input
              id="reg-pass"
              type="password"
              required
              className="input-minimal"
              placeholder="MINIMUM 6 CHARACTERS"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-minimal mt-2 w-full disabled:opacity-50"
          >
            {loading ? "RECORDING ENTRY..." : "COMMIT REGISTRATION"}
          </button>
        </form>

        <div className="text-center mt-6 pt-4 border-t border-[var(--border)]">
          <p className="text-xs text-[var(--ink)] opacity-70">
            ALREADY REGISTERED?{" "}
            <Link href="/login" className="font-utility text-[var(--accent)] hover:underline font-bold">
              LOGIN PORTAL
            </Link>
          </p>
        </div>
      </div>

      <div className="ledger-tab ledger-tab--accent mt-6 text-center text-xs opacity-75">
        <p className="font-utility text-[var(--ink)]">
          DATA SAVED DIRECTLY TO AUTONOMOUS LEDGER
        </p>
      </div>
    </main>
  );
}
