"use client";

import AnimatedBackground from "@/components/animated-background";
import Image from "next/image";
import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getMagic } from "@/lib/magic";
import { waitForEvmAddress } from "@/lib/magicSession";

export default function AuthClient() {
  const router = useRouter();
  const magic = useMemo(() => getMagic(), []);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!magic) return;
      const loggedIn = await magic.user.isLoggedIn();
      if (!cancelled && loggedIn) router.replace("/account");
    })();

    return () => {
      cancelled = true;
    };
  }, [magic, router]);

  const login = async () => {
    setErr(null);
    setLoading(true);

    try {
      if (!magic) throw new Error("Magic not ready");

      // 1) Open Magic Login UI (Email OTP etc.)
      await (magic as any).wallet.connectWithUI();

      // 2) Wait for embedded wallet address
      const addr = await waitForEvmAddress(magic as any);
      if (!addr) throw new Error("Wallet address not ready yet. Please retry.");

      // 3) Get ID token
      const idToken = await magic.user.getIdToken();

      // 4) Validate token / get issuer (DO NOT require address here)
      const res = await fetch("/api/auth/magic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(`Server login failed: ${res.status} ${txt}`);
      }

      // 5) Best-effort: persist wallet mapping (do not block redirect)
      fetch("/api/account/wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken, address: addr }),
      }).catch(() => {});

      // 6) Go to account page
      router.replace("/account");
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
            {err ? (
              <div className="rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
                {err}
              </div>
            ) : null}

            <button
              onClick={login}
              disabled={loading}
              className="w-full rounded-2xl bg-black px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
            >
              {loading ? "Opening login…" : "Continue"}
            </button>

            <p className="text-center text-xs text-[var(--re-muted)]">
              Secure sign-in • Wallet created automatically
            </p>
          </div>
        </motion.div>
      </div>
    </main>
  );
}