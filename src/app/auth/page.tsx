"use client";

import AnimatedBackground from "@/components/animated-background";
import { motion } from "framer-motion";
import Image from "next/image";
import { ConnectButton, useActiveAccount } from "panna-sdk/react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AuthPage() {
  const router = useRouter();
  const activeAccount = useActiveAccount();

  useEffect(() => {
    if (activeAccount?.address) router.replace("/account");
  }, [activeAccount?.address, router]);

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
          <div className="flex flex-col items-center text-center">
            <div className="h-14 w-14 overflow-hidden rounded-2xl bg-white/80 ring-1 ring-black/10">
              <Image src="/logo.png" alt="RemittEase" width={56} height={56} className="h-full w-full object-contain p-2" priority />
            </div>

            <div className="mt-4 text-xl font-semibold">Welcome to RemittEase</div>
            <div className="mt-1 text-sm text-[var(--re-muted)]">Cross-border payments, done properly.</div>
          </div>

          <div className="mt-7 panna-surface">
            <ConnectButton
              connectButton={{ title: "Continue" }}
              connectDialog={{
                title: "Sign in",
                description: "Secure access in a few seconds.",
                otpTitle: "Enter code",
                otpDescription: "Use the code we sent you.",
              }}
            />
          </div>
        </motion.div>
      </div>
    </main>
  );
}
