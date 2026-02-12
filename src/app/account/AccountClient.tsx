"use client";

import AnimatedBackground from "@/components/animated-background";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getMagic } from "@/lib/magic";
import { ArrowUpRight, ArrowDownLeft, Plus, UserRound } from "lucide-react";

type InfoWithAddress = { publicAddress?: string; email?: string | null };

function shortAddr(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-6)}`;
}

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function getInfoWithRetry(magic: any, tries = 6, delayMs = 250) {
  for (let i = 0; i < tries; i++) {
    const info = (await magic.user.getInfo()) as InfoWithAddress;
    if (info?.publicAddress) return info;
    await sleep(delayMs);
  }
  return null;
}

export default function AccountClient() {
  const router = useRouter();
  const magic = useMemo(() => getMagic(), []);

  const [checking, setChecking] = useState(true);
  const [address, setAddress] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        if (!magic) return;

        const loggedIn = await magic.user.isLoggedIn();
        if (!loggedIn) {
          if (!cancelled) router.replace("/auth");
          return;
        }

        // ✅ wait for address (prevents bounce back to /auth)
        const info = await getInfoWithRetry(magic);
        if (!info?.publicAddress) {
          if (!cancelled) router.replace("/auth");
          return;
        }

        if (!cancelled) {
          setAddress(info.publicAddress);
          setEmail(info.email ?? "");
        }
      } finally {
        if (!cancelled) setChecking(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [magic, router]);

  const handleLogout = async () => {
    if (!magic) return;
    await magic.user.logout();
    router.replace("/auth");
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {}
  };

  if (checking) {
    return (
      <main className="relative min-h-screen">
        <AnimatedBackground />
        <div className="mx-auto flex min-h-screen max-w-md items-center justify-center px-5">
          <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-gray-200 border-t-black" />
        </div>
      </main>
    );
  }

  if (!address) return null;

  const headerSub = email ? `Signed in as ${email}` : `Wallet ${shortAddr(address)}`;

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
                <span className="truncate max-w-[240px]">{headerSub}</span>
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
            <div className="text-sm font-semibold">{shortAddr(address)}</div>

            <button
              onClick={handleCopy}
              className="rounded-full border border-[var(--re-border)] bg-white/70 px-4 py-2 text-xs font-semibold hover:bg-white/90"
            >
              {copied ? "Copied" : "Copy"}
            </button>
          </div>

          <div className="mt-3 text-xs text-[var(--re-muted)]">
            This is your embedded wallet address created at signup/login.
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
