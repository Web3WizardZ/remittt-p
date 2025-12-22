"use client";

import AnimatedBackground from "@/components/animated-background";
import { PannaCtx } from "@/app/providers";
import { env } from "@/lib/env";
import { motion } from "framer-motion";
import Image from "next/image";
import { useContext } from "react";

export default function AuthPage() {
  const { ready, error, LoginButton } = useContext(PannaCtx);
  const canRender = ready && !!LoginButton;

  const theme = {
    mode: "light",
    accentColor: "#7C3AED",
    overlay: "rgba(2, 6, 23, 0.60)",
    borderRadius: 18,
  };

  return (
    <main className="relative min-h-screen">
      <AnimatedBackground />

      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 py-8">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55 }}
          className="rounded-3xl border border-[var(--re-border)] bg-[var(--re-card)] p-6 shadow-[0_20px_70px_rgba(0,0,0,0.35)]"
        >
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 overflow-hidden rounded-2xl bg-white/80 ring-1 ring-black/10">
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
              <div className="text-lg font-semibold">Welcome to RemittEase</div>
              <div className="text-sm text-[var(--re-muted)]">
                Sign in to start sending and receiving globally.
              </div>
            </div>
          </div>

          <div className="mt-5 space-y-2">
            <p className="text-sm leading-relaxed text-[var(--re-muted)]">
              Cross-border payments that feel local — fast, clear, and built for real life.
            </p>
          </div>

          <div className="mt-6 space-y-3">
            {!canRender ? (
              <button
                disabled
                className="w-full cursor-not-allowed rounded-full bg-white/10 px-4 py-3 text-sm font-semibold text-white/60"
              >
                {error ? "Sign-in unavailable" : "Loading secure sign-in…"}
              </button>
            ) : (
              <div className="panna-surface">
                {/* Panna handles sign-up/sign-in in its popup */}
                <LoginButton
                  partnerId={env.NEXT_PUBLIC_PARTNER_ID}
                  clientId={env.NEXT_PUBLIC_CLIENT_ID}
                  chainId={env.NEXT_PUBLIC_CHAIN_ID}
                  appName={env.NEXT_PUBLIC_APP_NAME}
                  appDescription={env.NEXT_PUBLIC_APP_DESCRIPTION}
                  theme={theme}
                />
              </div>
            )}

            {/* Dev-only diagnostics */}
            {process.env.NODE_ENV !== "production" && error ? (
              <div className="rounded-2xl border border-white/10 bg-black/30 p-3 text-xs text-white/80">
                <div className="font-semibold">Auth diagnostic</div>
                <div className="mt-1 break-words">{error}</div>
              </div>
            ) : null}

            <p className="text-center text-xs text-[var(--re-muted)]">
              If the popup doesn’t open, allow popups for this site.
            </p>
          </div>
        </motion.div>
      </div>
    </main>
  );
}
