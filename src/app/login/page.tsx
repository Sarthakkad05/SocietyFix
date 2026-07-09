"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const supabase = createClient();
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (authError) {
        setError(authError.message);
        setLoading(false);
        return;
      }

      if (!data.user) {
        setError("Could not retrieve user session.");
        setLoading(false);
        return;
      }

      // Retrieve user role from profiles
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .single();

      if (profileError || !profile) {
        // Fallback to resident dashboard if profile isn't found yet
        router.push("/dashboard");
      } else if (profile.role === "admin") {
        router.push("/admin");
      } else {
        router.push("/dashboard");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "An unexpected error occurred.";
      setError(msg);
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen py-12 px-4 max-w-md mx-auto flex flex-col justify-center gap-6">
      {/* Header */}
      <div className="text-center">
        <Link href="/" className="utility-caps text-[var(--accent)] font-semibold tracking-widest hover:underline">
          ← BACK TO DIRECTORY
        </Link>
        <h1 className="text-3xl font-bold mt-4 text-[var(--ink)]">SOCIETY-FIX</h1>
        <p className="font-utility text-xs text-[var(--ink-muted)] uppercase mt-1">LEDGER LOGIN PORTAL</p>
      </div>

      <div className="ledger-board p-6 bg-[var(--surface)]">
        {error && (
          <div className="border border-[var(--status-open)] text-[var(--status-open)] p-3 font-utility text-xs mb-4 bg-[var(--status-open)]/10 rounded-[6px]">
            ERROR: {error.toUpperCase()}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label htmlFor="login-email" className="utility-caps text-xs block mb-2 text-[var(--ink)] opacity-80">
              Email Address
            </label>
            <input
              id="login-email"
              type="email"
              required
              className="input-minimal"
              placeholder="E.g. RESIDENT@APT.COM"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label htmlFor="login-password" className="utility-caps text-xs block mb-2 text-[var(--ink)] opacity-80">
              Password
            </label>
            <input
              id="login-password"
              type="password"
              required
              className="input-minimal"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-minimal mt-4 w-full disabled:opacity-50 rounded-[6px]"
          >
            {loading ? "AUTHENTICATING..." : "ACCESS PORTAL"}
          </button>
        </form>

        <div className="text-center mt-6 pt-4 border-t border-[var(--border)]">
          <p className="text-xs text-[var(--ink-muted)]">
            NEW TENANT?{" "}
            <Link href="/signup" className="font-utility text-[var(--accent)] hover:underline font-bold">
              REGISTER HERE
            </Link>
          </p>
        </div>
      </div>

      <div className="ledger-tab ledger-tab--accent text-center text-xs">
        <p className="font-utility text-[var(--ink-muted)]">
          SUPABASE SECURED ACCESS ENVIRONMENT
        </p>
      </div>
    </main>
  );
}
