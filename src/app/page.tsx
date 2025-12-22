"use client";

import AnimatedBackground from "@/components/animated-background";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";

export default function Splash() {
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
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 overflow-hidden rounded-2xl bg-white/80 ring-1 ring-black/10">
              <Image
                src="/logo.png"
                alt="RemittEase"
                width={48}
                height={48}
                className="h-full w-full object-contain p-2"
                priority
              />
            </div>
            <div>
              <div className="text-xl font-semibold">RemittEase</div>
              <div className="text-sm text-[var(--re-muted)]">Cross-border payments, done properly.</div>
            </div>
          </div>

          <div className="mt-6 space-y-3">
            <h1 className="text-2xl font-semibold leading-tight">
              Send and receive money across countries — without the friction.
            </h1>
            <p className="text-sm leading-relaxed text-[var(--re-muted)]">
              Built for people and businesses that move value globally. Fast, transparent, and simple from the first tap.
            </p>
          </div>

          <div className="mt-7">
            <Link
              href="/auth"
              className="block w-full rounded-full bg-white px-5 py-3 text-center text-sm font-semibold text-black hover:bg-white/90"
            >
              Get started
            </Link>
            <p className="mt-3 text-center text-xs text-[var(--re-muted)]">
              You’re in control from start to finish.
            </p>
          </div>
        </motion.div>
      </div>
    </main>
  );
}
