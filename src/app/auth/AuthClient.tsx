"use client";

import AnimatedBackground from "@/components/animated-background";
import Image from "next/image";
import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getMagic } from "@/lib/magic";
import { getEvmAddressSafe } from "@/lib/magicSession";

const brandGradient = "linear-gradient(135deg, #4f46e5 0%, #a855f7 45%, #ec4899 100%)";

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
      const addr = await getEvmAddressSafe(magic);
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

      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 py-10">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55 }}
          className="re-card rounded-3xl p-7"
        >
          {/* Centered Brand */}
          <div className="flex flex-col items-center text-center">
            <div className="h-16 w-16 overflow-hidden rounded-2xl bg-white/80 ring-1 ring-black/10">
              <Image
                src="/logo.png"
                alt="RemittEase"
                width={64}
                height={64}
                className="h-full w-full object-contain p-2"
                priority
              />
            </div>

            <div className="mt-4 text-lg font-semibold leading-tight">Welcome back</div>
            <div className="mt-1 text-sm re-subtle">Sign in to continue</div>
          </div>

          {/* Message */}
          <div className="mt-8 text-center">
            <h1 className="text-2xl font-semibold leading-tight tracking-tight">
              Secure sign-in,{" "}
              <span
                className="bg-clip-text text-transparent"
                style={{ backgroundImage: brandGradient }}
              >
                wallet ready
              </span>
              .
            </h1>
            <p className="mt-3 text-sm re-subtle">
              Use a one-time code. No passwords.
            </p>
          </div>

          {/* Error */}
          {err ? (
            <div className="mt-5 rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
              {err}
            </div>
          ) : null}

          {/* CTA */}
          <div className="mt-6 space-y-3">
            <button
              onClick={login}
              disabled={loading}
              className="w-full rounded-2xl px-4 py-3 text-sm font-semibold text-white shadow-[0_14px_40px_rgba(0,0,0,0.18)] disabled:opacity-60 transition-transform active:scale-[0.99]"
              style={{ background: brandGradient }}
            >
              {loading ? "Opening login…" : "Continue"}
            </button>

            <button
              type="button"
              onClick={() => router.replace("/")}
              className="w-full rounded-2xl border border-[var(--re-border)] bg-white/60 px-4 py-3 text-sm font-semibold hover:bg-white/80"
            >
              Back
            </button>

            <p className="text-center text-xs re-subtle">Secure sign-in • Wallet created automatically</p>
          </div>
        </motion.div>
      </div>
    </main>
  );
}