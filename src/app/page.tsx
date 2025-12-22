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
          className="rounded-3xl border border-[var(--re-border)] bg-[var(--re-card)] p-7 text-center shadow-[0_20px_70px_rgba(0,0,0,0.25)]"
        >
          <div className="flex flex-col items-center">
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

            <div className="mt-3 text-xl font-semibold">RemittEase</div>
            <div className="mt-1 text-sm text-[var(--re-muted)]">
              Cross-border payments, done properly.
            </div>
          </div>

          <div className="mt-6">
            <h1 className="text-2xl font-semibold leading-tight">
              Send and receive across countries — fast.
            </h1>
          </div>

          <div className="mt-7">
            <Link
              href="/auth"
              className="block w-full rounded-full bg-white px-5 py-3 text-center text-sm font-semibold text-black hover:bg-white/90"
            >
              Get started
            </Link>
          </div>
        </motion.div>
      </div>
    </main>
  );
}
