"use client";

import AnimatedBackground from "@/components/animated-background";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getMagic } from "@/lib/magic";
import { waitForEvmAddress } from "@/lib/magicSession";
import { ArrowUpRight, ArrowDownLeft, Plus, UserRound } from "lucide-react";

function shortAddr(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-6)}`;
}

export default function AccountClient() {
  const router = useRouter();
  const magic = useMemo(() => getMagic(), []);

  const [ready, setReady] = useState(false);
  const [address, setAddress] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!magic) return;

      const loggedIn = await magic.user.isLoggedIn();
      if (!loggedIn) {
        if (!cancelled) router.replace("/auth");
        return;
      }

      // ✅ Wait briefly for address. Do NOT bounce back to /auth if empty.
      const addr = await waitForEvmAddress(magic as any);
      if (cancelled) return;

      if (!addr) {
        setReady(true);
        return;
      }

      const info = await magic.user.getInfo();
      const em = (info as any)?.email as string | undefined;

      setAddress(addr);
      setEmail(em ?? "");
      setReady(true);
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

  // Loading
  if (!ready) return null;

  // Logged in but address still not available (rare, but happens)
  if (ready && !address) {
    return (
      <main className="relative min-h-screen">
        <AnimatedBackground />

        <div className="mx-auto min-h-screen w-full max-w-md px-5 py-8">
          <div className="rounded-3xl border border-[var(--re-border)] bg-[var(--re-card)] p-6 shadow-[0_20px_70px_rgba(0,0,0,0.15)]">
            <div className="text-lg font-semibold">Finishing setup…</div>
            <div className="mt-2 text-sm text-[var(--re-muted)]">
              Your wallet is being provisioned. Refresh in a moment.
            </div>

            <button onClick={() => window.location.reload()} className="re-btn mt-5">
              Refresh
            </button>

            <button
              onClick={handleLogout}
              className="mt-3 w-full rounded-full border border-[var(--re-border)] bg-white/70 px-5 py-3 text-sm font-semibold hover:bg-white/90"
            >
              Logout
            </button>
          </div>
        </div>
      </main>
    );
  }

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
