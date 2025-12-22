"use client";

import AnimatedBackground from "@/components/animated-background";
import { PannaCtx } from "@/app/providers";
import { motion } from "framer-motion";
import Image from "next/image";
import { useContext } from "react";

// ✅ Use the React entry
import { ConnectButton } from "panna-sdk/react";

export default function AuthPage() {
  const { ready, error } = useContext(PannaCtx);

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
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 overflow-hidden rounded-2xl bg-white/70 ring-1 ring-black/5">
              <Image
                src="/logo.png"
                alt="RemittEase"
                width={44}
                height={44}
                className="h-full w-full object-contain p-2"
                priority
              />
            </div>
            <div>
              <div className="text-lg font-semibold">Welcome</div>
              <div className="text-sm text-[var(--re-muted)]">Sign in to continue</div>
            </div>
          </div>

          <div className="mt-6 space-y-3">
            {!ready ? (
              <button
                disabled
                className="w-full cursor-not-allowed rounded-full bg-black/10 px-4 py-3 text-sm font-semibold text-black/40"
              >
                Loading secure sign-in…
              </button>
            ) : (
              <div className="panna-surface">
                <ConnectButton />
              </div>
            )}

            {error ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                <div className="font-semibold">Setup issue</div>
                <div className="mt-1">{error}</div>
              </div>
            ) : null}
          </div>
        </motion.div>
      </div>
    </main>
  );
}
