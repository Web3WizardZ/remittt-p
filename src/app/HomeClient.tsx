"use client";

import AnimatedBackground from "@/components/animated-background";
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
            <div className="mt-1 text-sm re-subtle">Cross-border payments, done properly.</div>
          </div>

          <div className="mt-7 text-center">
            <h1 className="text-2xl font-semibold leading-tight">
              Send and receive across countries — fast.
            </h1>
            <p className="mt-2 text-sm re-subtle">Simple from the first tap.</p>
          </div>

          <div className="mt-8 space-y-3">
            <Link href="/auth" className="re-btn block text-center">
              Get started
            </Link>

            <Link
              href="/auth"
              className="block text-center text-sm font-semibold text-[var(--re-primary)]"
            >
              I already have an account
            </Link>

            <p className="text-center text-xs re-subtle">Secure sign-in • No long forms</p>
          </div>
        </motion.div>
      </div>
    </main>
  );
}
