"use client";

import AnimatedBackground from "@/components/animated-background";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  useActiveAccount,
  useConnectedAccounts,
  useLogout,
  usePanna,
  useTotalFiatBalance,
  useUserProfiles,
  BuyForm,
} from "panna-sdk/react";
import { FiatCurrency } from "panna-sdk/core";
import { ArrowDownLeft, ArrowUpRight, Plus, UserRound } from "lucide-react";

function formatMoney(amount: number, currency: FiatCurrency) {
  const locale = currency === FiatCurrency.ZAR ? "en-ZA" : "en-US";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

function shortAddr(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-6)}`;
}

function profileLabel(email?: string, phone?: string) {
  if (email) return email;
  if (phone) return phone;
  return "";
}

function DepositModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const stepperRef = useRef<any>(null);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="absolute left-1/2 top-1/2 w-[92%] max-w-md -translate-x-1/2 -translate-y-1/2">
        <div className="rounded-3xl border border-[var(--re-border)] bg-[var(--re-card)] p-6 shadow-[0_30px_90px_rgba(0,0,0,0.25)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-lg font-semibold">Deposit</div>
              <div className="text-sm text-[var(--re-muted)]">
                Add funds to your RemittEase balance
              </div>
            </div>

            <button
              onClick={onClose}
              className="rounded-full border border-[var(--re-border)] bg-white/70 px-4 py-2 text-xs font-semibold hover:bg-white/90"
            >
              Close
            </button>
          </div>

          <div className="mt-5 panna-surface">
            <BuyForm onClose={onClose} stepperRef={stepperRef} />
          </div>

          <p className="mt-3 text-center text-xs text-[var(--re-muted)]">
            If the provider popup doesn’t open, disable popup blockers for this site.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function AccountClient() {
  const router = useRouter();

  const activeAccount = useActiveAccount();
  const connectedAccounts = useConnectedAccounts();
  const { disconnect } = useLogout();
  const { client } = usePanna();

  const [currency, setCurrency] = useState<FiatCurrency>(FiatCurrency.USD);

  const [receiveOpen, setReceiveOpen] = useState(false);
  const [depositOpen, setDepositOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const address = activeAccount?.address ?? "";
  const isConnected = !!address;

  useEffect(() => {
    if (!address) router.replace("/auth");
  }, [address, router]);

  const { data: userProfiles } = useUserProfiles({ client: client! });

  const emailProfile = userProfiles?.find(
    (p: any) =>
      p.type === "email" ||
      p.type === "google" ||
      p.type === "discord" ||
      p.type === "apple" ||
      p.type === "facebook"
  );
  const phoneProfile = userProfiles?.find((p: any) => p.type === "phone");

  const userEmail = emailProfile?.details?.email;
  const userPhone = phoneProfile?.details?.phone;

  const { data: totalFiat = 0, isLoading: isLoadingTotal } = useTotalFiatBalance(
    { address, currency },
    { enabled: isConnected }
  );

  const headerSub = useMemo(() => {
    const label = profileLabel(userEmail, userPhone);
    return label ? `Signed in as ${label}` : `Wallet ${shortAddr(address)}`;
  }, [userEmail, userPhone, address]);

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

        {/* Balance */}
        <div className="mt-6 relative overflow-hidden rounded-3xl border border-[var(--re-border)] bg-[var(--re-card)] p-5 shadow-[0_20px_70px_rgba(0,0,0,0.15)]">
          {/* faint logo watermark */}
          <div className="pointer-events-none absolute right-[-22px] top-1/2 -translate-y-1/2 opacity-[0.08]">
            <Image src="/logo.png" alt="" width={220} height={220} className="rotate-[10deg]" />
          </div>

          <div className="relative flex items-start justify-between gap-3">
            <div>
              <div className="text-xs text-[var(--re-muted)]">Total balance</div>
              <div className="mt-2 text-3xl font-semibold leading-none">
                {isLoadingTotal ? "Loading…" : formatMoney(totalFiat, currency)}
              </div>
              <div className="mt-2 text-xs text-[var(--re-muted)]">
                Live total across your RemittEase wallet
              </div>
            </div>

            <div className="flex rounded-full border border-[var(--re-border)] bg-white/60 p-1">
              {[FiatCurrency.USD, FiatCurrency.ZAR].map((c) => (
                <button
                  key={c}
                  onClick={() => setCurrency(c)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    currency === c ? "bg-white text-black" : "text-[var(--re-muted)]"
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
            <ArrowUpRight className="mx-auto h-5 w-5" />
            <div className="mt-2 text-sm font-semibold">Send</div>
            <div className="mt-1 text-xs text-[var(--re-muted)]">Transfer</div>
          </button>

          <button
            onClick={() => setReceiveOpen(true)}
            className="rounded-2xl border border-[var(--re-border)] bg-white/70 px-3 py-4 text-center hover:bg-white/90"
          >
            <ArrowDownLeft className="mx-auto h-5 w-5" />
            <div className="mt-2 text-sm font-semibold">Receive</div>
            <div className="mt-1 text-xs text-[var(--re-muted)]">Get paid</div>
          </button>

          {/* ✅ Deposit now opens Panna flow modal */}
          <button
            onClick={() => setDepositOpen(true)}
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
            Share this address to receive funds.
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

      {/* ✅ Deposit modal (Panna BuyForm) */}
      <DepositModal open={depositOpen} onClose={() => setDepositOpen(false)} />
    </main>
  );
}
