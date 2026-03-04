"use client";

import dynamic from "next/dynamic";
const AnimatedBackground = dynamic(() => import("@/components/animated-background"), {
  ssr: false,
});

import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";

const brandGradient = "linear-gradient(135deg, #4f46e5 0%, #a855f7 45%, #ec4899 100%)";

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
          {/* Centered Brand */}
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

            <div className="mt-4 text-lg font-semibold leading-tight">RemittEase</div>
            <div className="mt-1 text-sm re-subtle">Cross-border payments</div>
          </div>

          {/* Message */}
          <div className="mt-8 text-center">
            <h1 className="text-3xl font-semibold leading-tight tracking-tight">
              Send money{" "}
              <span
                className="bg-clip-text text-transparent"
                style={{ backgroundImage: brandGradient }}
              >
                across borders
              </span>
              .
            </h1>

            <p className="mt-3 text-sm re-subtle">
              Fast transfers. Clean experience. Built for everyday use.
            </p>
          </div>

          {/* CTA */}
          <div className="mt-8 space-y-3">
            <Link
              href="/auth"
              className="block w-full rounded-2xl px-4 py-3 text-center text-sm font-semibold text-white shadow-[0_14px_40px_rgba(0,0,0,0.18)] transition-transform active:scale-[0.99]"
              style={{ background: brandGradient }}
            >
              Get started
            </Link>

            <p className="text-center text-xs re-subtle">Secure sign-in • Wallet created automatically</p>
          </div>
        </motion.div>
      </div>
    </main>
  );
}