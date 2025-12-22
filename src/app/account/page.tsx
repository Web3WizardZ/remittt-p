"use client";

import AnimatedBackground from "@/components/animated-background";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getEnvironmentChain,
  useAccountBalance,
  useActiveAccount,
  useConnectedAccounts,
  useLogout,
  usePanna,
} from "panna-sdk/react";

type Fiat = "ZAR" | "USD";

function coingeckoIdForSymbol(symbol?: string | null) {
  const s = (symbol ?? "").trim().toLowerCase();
  if (!s) return null;

  if (s === "lsk" || s.includes("lsk")) return "lisk";
  if (s === "eth" || s.includes("eth")) return "ethereum";
  if (s === "usdc") return "usd-coin";
  if (s === "usdt") return "tether";
  if (s === "dai") return "dai";

  return null;
}

function formatMoney(amount: number, fiat: Fiat) {
  const locale = fiat === "ZAR" ? "en-ZA" : "en-US";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: fiat,
    maximumFractionDigits: 2,
  }).format(amount);
}

function shortAddr(addr: string) {
  if (addr.length <= 12) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-6)}`;
}

export default function AccountPage() {
  const router = useRouter();

  const activeAccount = useActiveAccount();
  const connectedAccounts = useConnectedAccounts();
  const { disconnect } = useLogout();
  const { client, chainId } = usePanna();

  const [fiat, setFiat] = useState<Fiat>("ZAR");
  const [price, setPrice] = useState<number | null>(null);
  const [receiveOpen, setReceiveOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const isConnected = !!activeAccount?.address;

  useEffect(() => {
    if (!isConnected) router.replace("/auth");
  }, [isConnected, router]);

  const chain = useMemo(() => getEnvironmentChain(chainId), [chainId]);

  const { data: accountBalance, isLoading: isLoadingBalance } = useAccountBalance({
    address: activeAccount?.address || "",
    client: client!,
    chain: chain!,
  });

  const tokenSymbol =
    (accountBalance as any)?.symbol ??
    (accountBalance as any)?.tokenSymbol ??
    (accountBalance as any)?.token?.symbol ??
    "";

  const displayValue =
    (accountBalance as any)?.displayValue ??
    (accountBalance as any)?.value ??
    "0";

  const tokenAmount = useMemo(() => {
    const n = Number(displayValue);
    return Number.isFinite(n) ? n : 0;
  }, [displayValue]);

  const cgId = useMemo(() => coingeckoIdForSymbol(tokenSymbol), [tokenSymbol]);

  useEffect(() => {
    let alive = true;

    async function load() {
      if (!cgId) {
        setPrice(null);
        return;
      }

      try {
        const vs = fiat.toLowerCase();
        const res = await fetch(`/api/prices?ids=${encodeURIComponent(cgId)}&vs=${encodeURIComponent(vs)}`);
        const json = await res.json();

        const p = json?.[cgId]?.[vs];
        if (!alive) return;

        setPrice(typeof p === "number" ? p : null);
      } catch {
        if (!alive) return;
        setPrice(null);
      }
    }

    load();
    const t = setInterval(load, 60_000);

    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [cgId, fiat]);

  const fiatValue = useMemo(() => {
    if (!price) return null;
    return tokenAmount * price;
  }, [tokenAmount, price]);

  const handleLogout = () => {
    const first = connectedAccounts?.[0];
    if (first) disconnect(first);
    else router.replace("/auth");
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(activeAccount?.address ?? "");
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      // ignore
    }
  };

  if (!isConnected) return null;

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
              <div className="text-sm text-[var(--re-muted)]">
                {chain?.name ?? "Network"}
              </div>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="rounded-full border border-[var(--re-border)] bg-white/70 px-4 py-2 text-sm font-semibold"
          >
            Logout
          </button>
        </div>

        {/* Balance */}
        <div className="mt-6 re-card rounded-3xl p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xs text-[var(--re-muted)]">Balance</div>

              <div className="mt-2 text-3xl font-semibold leading-none">
                {fiatValue == null ? "—" : formatMoney(fiatValue, fiat)}
              </div>

              <div className="mt-2 text-sm text-[var(--re-muted)]">
                {isLoadingBalance ? "Loading…" : `${tokenAmount.toFixed(4)} ${tokenSymbol || ""}`.trim()}
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

        {/* Quick actions */}
        <div className="mt-4 grid grid-cols-3 gap-3">
          <button
            onClick={() => router.push("/send")}
            className="re-card rounded-2xl px-3 py-4 text-center"
          >
            <div className="text-sm font-semibold">Send</div>
            <div className="mt-1 text-xs text-[var(--re-muted)]">Transfer</div>
          </button>

          <button
            onClick={() => setReceiveOpen(true)}
            className="re-card rounded-2xl px-3 py-4 text-center"
          >
            <div className="text-sm font-semibold">Receive</div>
            <div className="mt-1 text-xs text-[var(--re-muted)]">Get paid</div>
          </button>

          <button
            onClick={() => router.push("/deposit")}
            className="re-card rounded-2xl px-3 py-4 text-center"
          >
            <div className="text-sm font-semibold">Deposit</div>
            <div className="mt-1 text-xs text-[var(--re-muted)]">Add funds</div>
          </button>
        </div>

        {/* Address */}
        <div className="mt-4 re-card rounded-3xl p-5">
          <div className="text-xs text-[var(--re-muted)]">Wallet</div>
          <div className="mt-2 flex items-center justify-between gap-3">
            <div className="text-sm font-semibold">{shortAddr(activeAccount.address)}</div>
            <button
              onClick={handleCopy}
              className="rounded-full border border-[var(--re-border)] bg-white/70 px-4 py-2 text-xs font-semibold"
            >
              {copied ? "Copied" : "Copy"}
            </button>
          </div>

          <div className="mt-3 text-xs text-[var(--re-muted)]">
            This is your RemittEase wallet address.
          </div>
        </div>

        {/* Footer nav */}
        <div className="mt-6 text-center text-xs text-[var(--re-muted)]">
          <Link href="/" className="font-semibold text-[var(--re-primary)]">
            Back to Home
          </Link>
        </div>
      </div>

      {/* Receive Modal */}
      {receiveOpen ? (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setReceiveOpen(false)}
          />
          <div className="absolute left-1/2 top-1/2 w-[92%] max-w-md -translate-x-1/2 -translate-y-1/2 re-card rounded-3xl p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-lg font-semibold">Receive</div>
                <div className="text-sm text-[var(--re-muted)]">
                  Share your wallet address to get paid.
                </div>
              </div>
              <button
                onClick={() => setReceiveOpen(false)}
                className="rounded-full border border-[var(--re-border)] bg-white/70 px-4 py-2 text-xs font-semibold"
              >
                Close
              </button>
            </div>

            <div className="mt-5 rounded-2xl border border-[var(--re-border)] bg-white/70 p-4">
              <div className="text-xs text-[var(--re-muted)]">Address</div>
              <div className="mt-2 break-all text-sm font-semibold">{activeAccount.address}</div>
            </div>

            <div className="mt-4">
              <button onClick={handleCopy} className="re-btn">
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
