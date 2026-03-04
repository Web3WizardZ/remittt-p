"use client";

import dynamic from "next/dynamic";
const AnimatedBackground = dynamic(() => import("@/components/animated-background"), {
  ssr: false,
});

import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";

export default function HomeClient() {
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
          {/* Brand */}
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
              <div className="text-lg font-semibold leading-tight">RemittEase</div>
              <div className="text-xs re-subtle">Cross-border payments</div>
            </div>
          </div>

          {/* Message */}
          <div className="mt-8">
            <h1 className="text-3xl font-semibold leading-tight tracking-tight">
              Send money across borders.
            </h1>
            <p className="mt-2 text-sm re-subtle">
              Fast, simple, and built for everyday transfers.
            </p>
          </div>

          {/* CTAs */}
          <div className="mt-8 space-y-3">
            <Link href="/auth" className="re-btn block text-center">
              Get started
            </Link>

            <Link
              href="/auth"
              className="block text-center text-sm font-semibold text-[var(--re-primary)]"
            >
              Sign in
            </Link>

            <p className="text-center text-xs re-subtle">
              Secure sign-in • Wallet created automatically
            </p>
          </div>
        </motion.div>
      </div>
    </main>
  );
}