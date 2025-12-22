"use client";

import AnimatedBackground from "@/components/animated-background";
import { PannaCtx } from "@/app/providers";
import { motion } from "framer-motion";
import Image from "next/image";
import { useContext, useEffect, useMemo, useState } from "react";

export default function AuthPage() {
  const { ready, error } = useContext(PannaCtx);
  const [LoginComp, setLoginComp] = useState<any>(null);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const mod: any = await import("panna-sdk");
        const Comp = mod?.LoginButton ?? mod?.ConnectButton ?? null;
        if (!mounted) return;
        setLoginComp(() => Comp);
      } catch {
        // handled by Providers error surface
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const canRender = useMemo(() => ready && LoginComp, [ready, LoginComp]);

  return (
    <main className="relative min-h-screen">
      <AnimatedBackground />

      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 py-8">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55 }}
          className="rounded-3xl border border-[var(--re-border)] bg-[var(--re-card)] p-6 shadow-[0_20px_70px_rgba(17,24,39,0.15)] backdrop-blur"
        >
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 overflow-hidden rounded-2xl bg-white/70 ring-1 ring-black/5">
              <Image src="/logo.png" alt="RemittEase" width={44} height={44} className="h-full w-full object-contain p-2" />
            </div>
            <div>
              <div className="text-lg font-semibold">Welcome</div>
              <div className="text-sm text-[var(--re-muted)]">Create an account or sign in</div>
            </div>
          </div>

          <div className="mt-5 space-y-2">
            <p className="text-sm leading-relaxed text-[var(--re-muted)]">
              Sign in to continue.
            </p>
          </div>

          <div className="mt-6 space-y-3">
            {!canRender ? (
              <button
                disabled
                className="w-full cursor-not-allowed rounded-full bg-black/10 px-4 py-3 text-sm font-semibold text-black/40"
              >
                {error ? "Auth unavailable" : "Loading secure sign-in…"}
              </button>
            ) : (
              <div className="panna-surface">
                {/* SDK button — Panna handles signup/signin in popup */}
                <LoginComp />
              </div>
            )}

            {error ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                <div className="font-semibold">Panna SDK error</div>
                <div className="mt-1">{error}</div>
                <div className="mt-2 text-red-600/80">
                  This is commonly caused by domain allowlist / origin restrictions.
                </div>
              </div>
            ) : null}

            <p className="text-center text-xs text-[var(--re-muted)]">
              Tip: if the popup doesn’t open, disable popup blockers for this site.
            </p>
          </div>
        </motion.div>
      </div>
    </main>
  );
}
