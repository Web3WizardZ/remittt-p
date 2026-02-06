"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getMagic } from "@/lib/magic";
import { ArrowDownLeft, ArrowUpRight, Plus, UserRound } from "lucide-react";

const AnimatedBackground = dynamic(
  () => import("@/components/animated-background"),
  { ssr: false }
);

function shortAddr(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-6)}`;
}

export default function AccountClient() {
  const router = useRouter();
  const magic = useMemo(() => getMagic(), []);

  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState<string>("");
  const [address, setAddress] = useState<string>("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        if (!magic) {
          router.replace("/auth");
          return;
        }
        const loggedIn = await magic.user.isLoggedIn();
        if (!loggedIn) {
          router.replace("/auth");
          return;
        }
        const info = await magic.user.getInfo();
        setEmail(info?.email ?? "");
        setAddress(info?.publicAddress ?? "");
      } finally {
        setLoading(false);
      }
    })();
  }, [magic, router]);

  const handleLogout = async () => {
    try {
      await magic?.user.logout();
    } catch {}
    router.replace("/auth");
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {}
  };

  if (loading) {
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
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 overflow-hidden rounded-2xl bg-white/80 ring-1 ring-black/10">
              <Image
                src="/logo.png"
                alt="RemittEase"
                width={40}
                height={40}
                className="h-full w-full object-contain p-2"
                priority
              />
            </div>
            <div>
              <div className="text-lg font-semibold">Account</div>
              <div className="flex items-center gap-2 text-sm text-[var(--re-muted)]">
                <UserRound className="h-4 w-4" />
                <span className="truncate max-w-[240px]">
                  {email ? `Signed in as ${email}` : address ? `Wallet ${shortAddr(address)}` : "Signed in"}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="rounded-full border border-[var(--re-border)] bg-white/70 px-4 py-2 text-sm font-semibold hover:bg-white/90"
          >
            Logout
          </button>
        </div>

        {/* Balance (placeholder until you wire real payments) */}
        <div className="mt-6 relative overflow-hidden rounded-3xl border border-[var(--re-border)] bg-[var(--re-card)] p-5 shadow-[0_20px_70px_rgba(0,0,0,0.15)]">
          <div className="pointer-events-none absolute right-[-22px] top-1/2 -translate-y-1/2 opacity-[0.08]">
            <Image src="/logo.png" alt="" width={220} height={220} className="rotate-[10deg]" />
          </div>

          <div className="relative">
            <div className="text-xs text-[var(--re-muted)]">Total balance</div>
            <div className="mt-2 text-3xl font-semibold leading-none">$0.00</div>
            <div className="mt-2 text-xs text-[var(--re-muted)]">
              Payments integration coming next.
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-4 grid grid-cols-3 gap-3">
          <button
            onClick={() => router.push("/send")}
            className="rounded-2xl border border-[var(--re-border)] bg-white/70 px-3 py-4 text-center hover:bg-white/90"
          >
            <ArrowUpRight className="mx-auto h-5 w-5" />
            <div className="mt-2 text-sm font-semibold">Send</div>
            <div className="mt-1 text-xs text-[var(--re-muted)]">Transfer</div>
          </button>

          <button
            onClick={() => router.push("/receive")}
            className="rounded-2xl border border-[var(--re-border)] bg-white/70 px-3 py-4 text-center hover:bg-white/90"
          >
            <ArrowDownLeft className="mx-auto h-5 w-5" />
            <div className="mt-2 text-sm font-semibold">Receive</div>
            <div className="mt-1 text-xs text-[var(--re-muted)]">Get paid</div>
          </button>

          <button
            onClick={() => router.push("/deposit")}
            className="rounded-2xl border border-[var(--re-border)] bg-white/70 px-3 py-4 text-center hover:bg-white/90"
          >
            <Plus className="mx-auto h-5 w-5" />
            <div className="mt-2 text-sm font-semibold">Deposit</div>
            <div className="mt-1 text-xs text-[var(--re-muted)]">Add funds</div>
          </button>
        </div>

        {/* Wallet */}
        <div className="mt-4 rounded-3xl border border-[var(--re-border)] bg-[var(--re-card)] p-5">
          <div className="text-xs text-[var(--re-muted)]">Wallet address</div>

          <div className="mt-2 flex items-center justify-between gap-3">
            <div className="text-sm font-semibold">
              {address ? shortAddr(address) : "—"}
            </div>

            <button
              onClick={handleCopy}
              disabled={!address}
              className="rounded-full border border-[var(--re-border)] bg-white/70 px-4 py-2 text-xs font-semibold hover:bg-white/90 disabled:opacity-60"
            >
              {copied ? "Copied" : "Copy"}
            </button>
          </div>

          <div className="mt-3 text-xs text-[var(--re-muted)]">
            Share this address to receive funds.
          </div>
        </div>

        <div className="mt-6 text-center text-xs text-[var(--re-muted)]">
          <Link href="/" className="font-semibold text-[var(--re-primary)]">
            Back to Home
          </Link>
        </div>
      </div>
    </main>
  );
}
