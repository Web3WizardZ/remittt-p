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

            <div className="mt-4 text-2xl font-semibold">RemittEase</div>
            <div className="mt-1 text-sm text-[var(--re-muted)]">
              Cross-border payments, done properly.
            </div>
          </div>

          <div className="mt-7 text-center">
            <h1 className="text-2xl font-semibold leading-tight">
              Send and receive across borders.
            </h1>
            <p className="mt-2 text-sm text-[var(--re-muted)]">Fast. Transparent. Simple.</p>
          </div>

          <div className="mt-8">
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
