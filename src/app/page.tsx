"use client";

import AnimatedBackground from "@/components/animated-background";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";

export default function Splash() {
  return (
    <main className="relative min-h-screen">
      <AnimatedBackground />

      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-between px-5 py-8">
        <div />

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55 }}
          className="rounded-3xl border border-[var(--re-border)] bg-[var(--re-card)] p-6 shadow-[0_20px_70px_rgba(17,24,39,0.15)] backdrop-blur"
        >
          <div className="flex items-center gap-3">
            {/* Put your logo in /public/logo.png */}
            <div className="h-11 w-11 overflow-hidden rounded-2xl bg-white/70 ring-1 ring-black/5">
              <Image src="/logo.png" alt="RemittEase" width={44} height={44} className="h-full w-full object-contain p-2" />
            </div>
            <div>
              <div className="text-lg font-semibold">RemittEase</div>
              <div className="text-sm text-[var(--re-muted)]">Cross-border payments, done right.</div>
            </div>
          </div>

          <div className="mt-5 space-y-2">
            <h1 className="text-2xl font-bold leading-tight">
              Send, receive, and manage money across countries — fast.
            </h1>
            <p className="text-sm leading-relaxed text-[var(--re-muted)]">
              Get started!
            </p>
          </div>

          <div className="mt-6">
            <Link
              href="/auth"
              className="block w-full rounded-full bg-gradient-to-r from-violet-600 to-pink-500 px-4 py-3 text-center text-sm font-semibold text-white shadow-[0_10px_30px_rgba(124,58,237,0.25)] active:scale-[0.99]"
            >
              Get started
            </Link>
            <p className="mt-3 text-center text-xs text-[var(--re-muted)]">
              By continuing, you agree to our Terms & Privacy Policy.
            </p>
          </div>
        </motion.div>

        <div className="pb-2 text-center text-xs text-black/40">© RemittEase</div>

      </div>
    </main>
  );
}
