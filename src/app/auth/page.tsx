"use client";

import AnimatedBackground from "@/components/animated-background";
import { PannaCtx } from "@/app/providers";
import { motion } from "framer-motion";
import Image from "next/image";
import { useContext, useEffect, useMemo, useState } from "react";

export default function AuthPage() {
  const { ready, error } = useContext(PannaCtx);
  const [AuthButton, setAuthButton] = useState<any>(null);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        let mod: any;
        try {
          mod = await import("panna-sdk/react");
        } catch {
          mod = await import("panna-sdk");
        }

        const Comp =
          mod?.LoginButton ??
          mod?.ConnectButton ??
          mod?.default?.LoginButton ??
          mod?.default?.ConnectButton ??
          null;

        if (!mounted) return;
        setAuthButton(() => Comp);
      } catch {
        // provider surface will show error if needed
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const canRender = useMemo(() => ready && !!AuthButton, [ready, AuthButton]);

  return (
    <main className="relative min-h-screen">
      <AnimatedBackground />

      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 py-10">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55 }}
          className="rounded-3xl border border-[var(--re-border)] bg-[var(--re-card)] p-7 shadow-[0_20px_70px_rgba(0,0,0,0.35)]"
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

            <div className="mt-4 text-xl font-semibold">RemittEase</div>
            <div className="mt-1 text-sm text-[var(--re-muted)]">
              Cross-border payments, done properly.
            </div>
          </div>

          <div className="mt-6 text-center">
            <div className="text-sm text-[var(--re-muted)]">Sign in to continue.</div>
          </div>

          <div className="mt-7 space-y-3">
            {!canRender ? (
              <button
                disabled
                className="w-full cursor-not-allowed rounded-full bg-black/10 px-4 py-3 text-sm font-semibold text-black/40"
              >
                {error ? "Sign-in unavailable" : "Loading…"}
              </button>
            ) : (
              <div className="panna-surface">
                <AuthButton />
              </div>
            )}

            {error ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                <div className="font-semibold">Panna SDK error</div>
                <div className="mt-1">{error}</div>
              </div>
            ) : null}
          </div>
        </motion.div>
      </div>
    </main>
  );
}
