"use client";

import AnimatedBackground from "@/components/animated-background";
import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getEnvironmentChain,
  useAccountBalance,
  useActiveAccount,
  useConnectedAccounts,
  useLogout,
  usePanna,
  useTotalFiatBalance,
} from "panna-sdk/react";
import { FiatCurrency } from "panna-sdk/core";

type Fiat = "ZAR" | "USD";

function formatMoney(amount: number, fiat: Fiat) {
  const locale = fiat === "ZAR" ? "en-ZA" : "en-US";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: fiat,
    maximumFractionDigits: 2,
  }).format(amount);
}

function shortAddr(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-6)}`;
}

export default function AccountPage() {
  const router = useRouter();

  const activeAccount = useActiveAccount();
  const connectedAccounts = useConnectedAccounts();
  const { disconnect } = useLogout();
  const { client, chainId } = usePanna();

  const [fiat, setFiat] = useState<Fiat>("ZAR");
  const [receiveOpen, setReceiveOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const address = activeAccount?.address ?? "";
  const isConnected = !!activeAccount?.address;

  const chain = useMemo(() => getEnvironmentChain(chainId), [chainId]);

  // Native balance (e.g. ETH on Lisk)
  const { data: nativeBal, isLoading: nativeLoading } = useAccountBalance({
    address,
    client: client!,
    chain,
  });

  // Total portfolio value in fiat (live prices via Panna)
  const pannaFiat = fiat === "ZAR" ? FiatCurrency.ZAR : FiatCurrency.USD;
  const { data: totalFiat, isLoading: fiatLoading } = useTotalFiatBalance(
    { address, currency: pannaFiat },
    { enabled: isConnected }
  );

  const handleLogout = () => {
    const first = connectedAccounts?.[0];
    if (first) disconnect(first);
    router.replace("/auth");
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {}
  };

  if (!isConnected) {
    router.replace("/auth");
    return null;
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
              <div className="text-lg font-semibold">RemittEase</div>
              <div className="text-sm text-[var(--re-muted)]">{chain?.name ?? "Network"}</div>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="rounded-full border border-[var(--re-border)] bg-white/70 px-4 py-2 text-sm font-semibold hover:bg-white/90"
          >
            Logout
          </button>
        </div>

        {/* Balance Card */}
        <div className="mt-6 rounded-3xl border border-[var(--re-border)] bg-[var(--re-card)] p-5 shadow-[0_20px_70px_rgba(0,0,0,0.15)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xs text-[var(--re-muted)]">Available</div>

              <div className="mt-2 text-3xl font-semibold leading-none">
                {fiatLoading ? "Loading…" : formatMoney(totalFiat ?? 0, fiat)}
              </div>

              <div className="mt-2 text-sm text-[var(--re-muted)]">
                {nativeLoading
                  ? "Fetching wallet balance…"
                  : `${nativeBal?.displayValue ?? "0"} ${nativeBal?.symbol ?? ""}`.trim()}
              </div>
            </div>

            <div className="flex rounded-full border border-[var(--re-border)] bg-white/60 p-1">
              {(["ZAR", "USD"] as Fiat[]).map((c) => (
                <button
                  key={c}
                  onClick={() => setFiat(c)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    fiat === c ? "bg-white text-black" : "text-[var(--re-muted)]"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-4 grid grid-cols-3 gap-3">
          <button
            onClick={() => router.push("/send")}
            className="rounded-2xl border border-[var(--re-border)] bg-white/70 px-3 py-4 text-center hover:bg-white/90"
          >
            <div className="text-sm font-semibold">Send</div>
            <div className="mt-1 text-xs text-[var(--re-muted)]">Transfer</div>
          </button>

          <button
            onClick={() => setReceiveOpen(true)}
            className="rounded-2xl border border-[var(--re-border)] bg-white/70 px-3 py-4 text-center hover:bg-white/90"
          >
            <div className="text-sm font-semibold">Receive</div>
            <div className="mt-1 text-xs text-[var(--re-muted)]">Get paid</div>
          </button>

          <button
            onClick={() => router.push("/deposit")}
            className="rounded-2xl border border-[var(--re-border)] bg-white/70 px-3 py-4 text-center hover:bg-white/90"
          >
            <div className="text-sm font-semibold">Deposit</div>
            <div className="mt-1 text-xs text-[var(--re-muted)]">Add funds</div>
          </button>
        </div>

        {/* Wallet */}
        <div className="mt-4 rounded-3xl border border-[var(--re-border)] bg-[var(--re-card)] p-5">
          <div className="text-xs text-[var(--re-muted)]">Wallet</div>

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
            This is your RemittEase wallet address.
          </div>
        </div>

        <div className="mt-6 text-center text-xs text-[var(--re-muted)]">
          <Link href="/" className="font-semibold text-[var(--re-primary)]">
            Back to Home
          </Link>
        </div>
      </div>

      {/* Receive modal */}
      {receiveOpen ? (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setReceiveOpen(false)}
          />
          <div className="absolute left-1/2 top-1/2 w-[92%] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-[var(--re-border)] bg-[var(--re-card)] p-6 shadow-[0_30px_90px_rgba(0,0,0,0.25)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-lg font-semibold">Receive</div>
                <div className="text-sm text-[var(--re-muted)]">Share this address to get paid.</div>
              </div>
              <button
                onClick={() => setReceiveOpen(false)}
                className="rounded-full border border-[var(--re-border)] bg-white/70 px-4 py-2 text-xs font-semibold hover:bg-white/90"
              >
                Close
              </button>
            </div>

            <div className="mt-5 rounded-2xl border border-[var(--re-border)] bg-white/70 p-4">
              <div className="text-xs text-[var(--re-muted)]">Address</div>
              <div className="mt-2 break-all text-sm font-semibold">{address}</div>
            </div>

            <div className="mt-4">
              <button
                onClick={handleCopy}
                className="w-full rounded-full bg-gradient-to-r from-[var(--re-primary)] to-[var(--re-accent)] px-5 py-3 text-sm font-semibold text-white hover:opacity-95"
              >
                {copied ? "Copied" : "Copy address"}
              </button>
            </div>

            <p className="mt-3 text-center text-xs text-[var(--re-muted)]">
              Only share this address with someone you trust.
            </p>
          </div>
        </div>
      ) : null}
    </main>
  );
}
