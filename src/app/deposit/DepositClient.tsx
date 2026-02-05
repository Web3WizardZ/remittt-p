"use client";

import AnimatedBackground from "@/components/animated-background";
import { BuyForm, useActiveAccount, usePanna } from "panna-sdk/react";
import { useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";

export default function DepositClient() {
  const router = useRouter();
  const account = useActiveAccount();
  const { siweAuth } = usePanna();
  const stepperRef = useRef<any>(null);

  const hasValidToken = useMemo(() => siweAuth.getValidAuthToken() !== null, [siweAuth]);

  useEffect(() => {
    if (!account?.address) {
      router.replace("/auth");
      return;
    }
    if (!hasValidToken) {
      router.replace("/auth");
    }
  }, [account?.address, hasValidToken, router]);

  if (!account?.address || !hasValidToken) {
    return (
      <main className="relative min-h-screen">
        <AnimatedBackground />
        <div className="flex min-h-screen items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-gray-200 border-t-black" />
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen">
      <AnimatedBackground />
      <div className="mx-auto min-h-screen w-full max-w-md px-5 py-8">
        <div className="rounded-3xl border border-[var(--re-border)] bg-[var(--re-card)] p-6 shadow-[0_20px_70px_rgba(0,0,0,0.15)]">
          <div className="text-lg font-semibold">Deposit</div>
          <div className="text-sm text-[var(--re-muted)]">Add funds to your RemittEase balance</div>

          <div className="mt-6">
            <div className="panna-surface">
              <BuyForm onClose={() => router.push("/account")} stepperRef={stepperRef} />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
