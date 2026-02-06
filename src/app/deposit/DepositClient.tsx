"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getMagic } from "@/lib/magic";

const AnimatedBackground = dynamic(
  () => import("@/components/animated-background"),
  { ssr: false }
);

export default function DepositClient() {
  const router = useRouter();
  const magic = useMemo(() => getMagic(), []);
  const [ok, setOk] = useState(false);

  useEffect(() => {
    (async () => {
      if (!magic) return router.replace("/auth");
      const loggedIn = await magic.user.isLoggedIn();
      if (!loggedIn) return router.replace("/auth");
      setOk(true);
    })();
  }, [magic, router]);

  if (!ok) {
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
          <div className="text-sm text-[var(--re-muted)]">
            Deposit flow is coming next (Panna removed).
          </div>

          <Link
            href="/account"
            className="mt-6 inline-block font-semibold text-[var(--re-primary)]"
          >
            Back to account
          </Link>
        </div>
      </div>
    </main>
  );
}
