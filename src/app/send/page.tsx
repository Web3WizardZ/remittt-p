"use client";

import AnimatedBackground from "@/components/animated-background";
import Link from "next/link";

export default function SendPage() {
  return (
    <main className="relative min-h-screen">
      <AnimatedBackground />
      <div className="mx-auto min-h-screen w-full max-w-md px-5 py-8">
        <div className="re-card rounded-3xl p-6">
          <div className="text-lg font-semibold">Send</div>
          <div className="mt-1 text-sm text-[var(--re-muted)]">
            Next: recipient, amount, and confirmation flow.
          </div>

          <Link href="/account" className="mt-6 inline-block font-semibold text-[var(--re-primary)]">
            Back to account
          </Link>
        </div>
      </div>
    </main>
  );
}
