"use client";

import AnimatedBackground from "@/components/animated-background";
import Image from "next/image";
import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getMagic } from "@/lib/magic";

export default function AuthClient() {
  const router = useRouter();
  const magic = useMemo(() => getMagic(), []);

  const [email, setEmail] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      if (!magic) return;
      const loggedIn = await magic.user.isLoggedIn();
      if (loggedIn) router.replace("/account");
    })();
  }, [magic, router]);

  const completeLogin = async (didToken: string) => {
    const res = await fetch("/api/auth/magic", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ didToken }),
    });
    if (!res.ok) throw new Error("Server login failed");
    router.replace("/account");
  };

  const loginEmailOtp = async () => {
    setErr(null);
    setLoading(true);

    try {
      if (!magic) throw new Error("Magic not ready");

      const normalizedEmail = email.trim();
      if (!normalizedEmail) throw new Error("Please enter your email");

      const didToken = await magic.auth.loginWithEmailOTP({
        email: normalizedEmail,
      });

      if (!didToken) throw new Error("Missing DID token");
      await completeLogin(didToken);
    } catch (e: any) {
      setErr(e?.message ?? "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative min-h-screen">
      <AnimatedBackground />

      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 py-8">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55 }}
          className="rounded-3xl border border-[var(--re-border)] bg-[var(--re-card)] p-6 shadow-[0_20px_70px_rgba(17,24,39,0.15)]"
        >
          <div className="flex flex-col items-center text-center">
            <div className="h-14 w-14 overflow-hidden rounded-2xl bg-white/80 ring-1 ring-black/10">
              <Image
                src="/logo.png"
                alt="RemittEase"
                width={56}
                height={56}
                className="h-full w-full object-contain p-2"
                priority
              />
            </div>

            <div className="mt-4 text-xl font-semibold">Welcome to RemittEase</div>
            <div className="mt-1 text-sm text-[var(--re-muted)]">
              Cross-border payments, done properly.
            </div>
          </div>

          <div className="mt-7 space-y-3">
            <label className="block text-xs text-[var(--re-muted)]">Email</label>

            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              inputMode="email"
              autoComplete="email"
              className="w-full rounded-2xl border border-[var(--re-border)] bg-white/70 px-4 py-3 text-sm outline-none"
            />

            {err ? (
              <div className="rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
                {err}
              </div>
            ) : null}

            <button
              onClick={loginEmailOtp}
              disabled={!email.trim() || loading}
              className="w-full rounded-2xl bg-black px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
            >
              {loading ? "Sending code…" : "Continue with Email"}
            </button>

            <p className="text-center text-xs text-[var(--re-muted)]">
              You’ll receive a one-time code to verify your email.
            </p>
          </div>
        </motion.div>
      </div>
    </main>
  );
}
