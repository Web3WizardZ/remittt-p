"use client";

import AnimatedBackground from "@/components/animated-background";
import {
  BuyForm,
  ConnectButton,
  useActiveAccount,
  useConnectedAccounts,
  useLogout,
  usePanna,
} from "panna-sdk/react";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

function useSiweReady() {
  const { siweAuth } = usePanna();
  const [ready, setReady] = useState(false);
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    setReady(!!siweAuth.getValidAuthToken());
    setTimedOut(false);

    const started = Date.now();
    const t = window.setInterval(() => {
      const ok = !!siweAuth.getValidAuthToken();
      if (ok) {
        setReady(true);
        window.clearInterval(t);
        return;
      }
      if (Date.now() - started > 8000) {
        setTimedOut(true);
        window.clearInterval(t);
      }
    }, 350);

    return () => window.clearInterval(t);
  }, [siweAuth]);

  return { ready, timedOut };
}

export default function DepositPage() {
  const router = useRouter();
  const account = useActiveAccount();
  const { ready, timedOut } = useSiweReady();

  const connected = useConnectedAccounts();
  const { disconnect } = useLogout();

  const stepperRef = useRef<any>(null);

  const forceReauth = () => {
    const active = connected?.[0];
    if (active) disconnect(active);
  };

  return (
    <main className="relative min-h-screen">
      <AnimatedBackground />
      <div className="mx-auto min-h-screen w-full max-w-md px-5 py-8">
        <div className="rounded-3xl border border-[var(--re-border)] bg-[var(--re-card)] p-6 shadow-[0_20px_70px_rgba(0,0,0,0.15)]">
          <div className="text-lg font-semibold">Deposit</div>
          <div className="text-sm text-[var(--re-muted)]">Add funds to your RemittEase balance</div>

          <div className="mt-6 space-y-4">
            {!account ? (
              <div className="panna-surface">
                <ConnectButton />
              </div>
            ) : !ready ? (
              <div className="rounded-2xl border border-[var(--re-border)] bg-white/70 p-4">
                <div className="text-sm font-semibold">Securing your session…</div>
                <div className="mt-1 text-xs text-[var(--re-muted)]">
                  This usually takes a moment after you sign in.
                </div>

                {timedOut ? (
                  <div className="mt-3 space-y-2">
                    <div className="text-xs text-red-600">
                      We couldn’t start a secure session. Please reconnect.
                    </div>
                    <button
                      onClick={forceReauth}
                      className="w-full rounded-full bg-black px-4 py-3 text-sm font-semibold text-white"
                    >
                      Reconnect
                    </button>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="panna-surface">
                <BuyForm
                  onClose={() => router.push("/account")}
                  stepperRef={stepperRef}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
