// src/app/account/AccountClient.tsx
"use client";

import AnimatedBackground from "@/components/animated-background";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getMagic } from "@/lib/magic";
import { getEvmAddressSafe } from "@/lib/magicSession";
import { ethers } from "ethers";
import {
  ArrowUpRight,
  ArrowDownLeft,
  Plus,
  UserRound,
  Wallet,
  QrCode,
  Coins,
  ExternalLink,
  RefreshCcw,
} from "lucide-react";

function shortAddr(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-6)}`;
}

function formatUSD(n: number) {
  if (!Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: n >= 1000 ? 0 : 2,
  }).format(n);
}

function formatEth(n: number) {
  if (!Number.isFinite(n)) return "— ETH";
  return `${new Intl.NumberFormat("en-US", {
    maximumFractionDigits: n >= 1 ? 4 : 6,
  }).format(n)} ETH`;
}

type Phase =
  | "init"
  | "check-login"
  | "get-info"
  | "validate"
  | "get-address"
  | "done";

export default function AccountClient() {
  const router = useRouter();

  const [magicInitError, setMagicInitError] = useState<string>("");
  const magic = useMemo(() => {
    try {
      return getMagic();
    } catch (e: any) {
      setMagicInitError(e?.message ?? "Failed to initialize Magic");
      return null as any;
    }
  }, []);

  const [ready, setReady] = useState(false);
  const [phase, setPhase] = useState<Phase>("init");

  const [address, setAddress] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [issuer, setIssuer] = useState<string>("");

  const [copied, setCopied] = useState(false);
  const [linkStatus, setLinkStatus] = useState<
    "idle" | "linking" | "linked" | "failed"
  >("idle");

  const [error, setError] = useState<string>("");

  // Balance
  const [balLoading, setBalLoading] = useState(false);
  const [balError, setBalError] = useState("");
  const [ethAmount, setEthAmount] = useState(0);
  const [usdAmount, setUsdAmount] = useState(0);
  const [ethPriceUsd, setEthPriceUsd] = useState(0);

  const brandGradient =
    "linear-gradient(135deg, #4f46e5 0%, #a855f7 45%, #ec4899 100%)";

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

  const loadBalance = async () => {
    if (!magic) return;

    setBalLoading(true);
    setBalError("");

    try {
      const provider = new ethers.BrowserProvider((magic as any).rpcProvider);
      const signer = await provider.getSigner();
      const addr = await signer.getAddress();

      const balWei = await provider.getBalance(addr);
      const eth = Number(ethers.formatEther(balWei));

      const priceRes = await fetch("/api/price/eth", { cache: "no-store" });
      const priceJson = await priceRes.json().catch(() => ({}));
      if (!priceRes.ok) throw new Error(priceJson?.error ?? "Price unavailable");

      const price = Number(priceJson?.usd ?? 0);
      const usd = eth * price;

      setEthAmount(eth);
      setEthPriceUsd(price);
      setUsdAmount(usd);
    } catch (e: any) {
      setBalError(e?.message ?? "Could not load balance");
      setEthAmount(0);
      setUsdAmount(0);
      setEthPriceUsd(0);
    } finally {
      setBalLoading(false);
    }
  };

  // Boot + session + address
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        if (!magic) {
          setError(magicInitError || "Magic is not initialized");
          return;
        }

        setPhase("check-login");
        const loggedIn = await magic.user.isLoggedIn();
        if (!loggedIn) {
          if (!cancelled) router.replace("/auth");
          return;
        }

        setPhase("get-info");
        try {
          const info = await magic.user.getInfo();
          const em = (info as any)?.email as string | undefined;
          if (!cancelled) setEmail(em ?? "");
        } catch {}

        const idToken = await magic.user.getIdToken();

        setPhase("validate");
        try {
          const res = await fetch("/api/auth/magic", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ idToken }),
          });

          if (!res.ok) {
            const txt = await res.text().catch(() => "");
            throw new Error(`Auth failed: ${res.status} ${txt}`);
          }

          const data = await res.json().catch(() => ({}));
          if (!cancelled) setIssuer(String(data?.issuer ?? ""));
        } catch (e: any) {
          if (!cancelled)
            setError(e?.message ?? "Failed to validate session");
        }

        setPhase("get-address");
        const addr = await getEvmAddressSafe(magic);

        if (cancelled) return;

        if (addr) {
          setAddress(addr);

          // Keep this “in-app” (RemittEase) and only store locally for UX
          try {
            if (issuer) {
              setLinkStatus("linking");
              localStorage.setItem(`re_wallet_${issuer}`, addr);
              setLinkStatus("linked");
            }
          } catch {
            setLinkStatus("failed");
          }

          fetch("/api/account/wallet", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ idToken, address: addr }),
          }).catch(() => {});
        } else {
          setAddress("");
        }

        setPhase("done");
      } catch (e: any) {
        if (!cancelled)
          setError(e?.message ?? "Unknown error on account page");
      } finally {
        if (!cancelled) setReady(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [magic, magicInitError, router, issuer]);

  useEffect(() => {
    if (!magic || !address) return;
    loadBalance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [magic, address]);

  // Widget UI actions (open only when user taps; keeps UI “predominantly RemittEase”)
  const openWalletUI = async () => {
    if (!magic) return;
    try {
      await (magic as any).wallet?.showUI?.();
    } catch (e: any) {
      setError(e?.message ?? "Could not open wallet");
    }
  };

  const openSendUI = async () => {
    if (!magic) return;
    try {
      await (magic as any).wallet?.showSendTokensUI?.();
    } catch (e: any) {
      setError(e?.message ?? "Could not open send UI");
    }
  };

  const openAddressQR = async () => {
    if (!magic) return;
    try {
      await (magic as any).wallet?.showAddress?.();
    } catch (e: any) {
      setError(e?.message ?? "Could not open address QR");
    }
  };

  const openBalancesUI = async () => {
    if (!magic) return;
    try {
      await (magic as any).wallet?.showBalances?.();
    } catch (e: any) {
      setError(e?.message ?? "Could not open balances");
    }
  };

  const openOnRamp = async () => {
    if (!magic) return;
    try {
      await (magic as any).wallet?.showOnRamp?.();
    } catch (e: any) {
      setError(e?.message ?? "Could not open on-ramp");
    }
  };

  const showLinking = issuer && linkStatus === "linking";
  const showConnected = issuer && linkStatus === "linked";
  const showConnFailed = issuer && linkStatus === "failed";

  if (!ready) {
    const title =
      phase === "check-login"
        ? "Checking your session…"
        : phase === "get-info"
        ? "Preparing your account…"
        : phase === "validate"
        ? "Securing your sign-in…"
        : phase === "get-address"
        ? "Setting up your wallet…"
        : "Loading your account…";

    const subtitle =
      phase === "check-login"
        ? "Just a moment while we verify you."
        : phase === "get-info"
        ? "Fetching your profile details."
        : phase === "validate"
        ? "Confirming your secure session."
        : phase === "get-address"
        ? "Creating your embedded wallet address."
        : "Almost there.";

    return (
      <main className="relative min-h-screen">
        <AnimatedBackground />
        <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 py-10">
          <div className="re-card rounded-3xl p-7">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 overflow-hidden rounded-2xl bg-white/80 ring-1 ring-black/10">
                <Image
                  src="/logo.png"
                  alt="RemittEase"
                  width={48}
                  height={48}
                  className="h-full w-full object-contain p-2"
                  priority
                />
              </div>
              <div>
                <div className="text-lg font-semibold leading-tight">
                  RemittEase
                </div>
                <div className="text-xs re-subtle">Getting things ready</div>
              </div>
            </div>

            <div className="mt-7">
              <div className="text-2xl font-semibold leading-tight tracking-tight">
                {title}
              </div>
              <div className="mt-2 text-sm re-subtle">{subtitle}</div>
            </div>

            <div className="mt-6">
              <div className="h-2 w-full overflow-hidden rounded-full bg-black/10">
                <div
                  className="h-full w-1/3 rounded-full"
                  style={{
                    background: "var(--re-primary)",
                    animation: "re-loading-bar 1.2s ease-in-out infinite",
                  }}
                />
              </div>
              <div className="mt-3 text-center text-xs re-subtle">
                Please don’t close this page.
              </div>
            </div>

            {(magicInitError || error) && (
              <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                <div className="font-semibold">We hit a snag</div>
                <div className="mt-1">
                  Please refresh the page. If it keeps happening, sign out and
                  try again.
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <button
                    onClick={() => window.location.reload()}
                    className="w-full rounded-2xl px-4 py-3 text-sm font-semibold text-white"
                    style={{ background: "var(--re-primary)" }}
                  >
                    Refresh
                  </button>

                  <button
                    onClick={handleLogout}
                    className="w-full rounded-2xl border border-[var(--re-border)] bg-white/60 px-4 py-3 text-sm font-semibold hover:bg-white/80"
                  >
                    Sign out
                  </button>
                </div>
              </div>
            )}
          </div>

          <style jsx>{`
            @keyframes re-loading-bar {
              0% {
                transform: translateX(-60%);
                width: 35%;
                opacity: 0.75;
              }
              50% {
                transform: translateX(40%);
                width: 55%;
                opacity: 1;
              }
              100% {
                transform: translateX(160%);
                width: 35%;
                opacity: 0.75;
              }
            }
          `}</style>
        </div>
      </main>
    );
  }

  if (ready && !address) {
    return (
      <main className="relative min-h-screen">
        <AnimatedBackground />
        <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 py-10">
          <div className="re-card rounded-3xl p-7">
            <div className="text-2xl font-semibold">Finalizing your wallet…</div>
            <div className="mt-2 text-sm re-subtle">
              This can take a few seconds the first time.
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                onClick={() => window.location.reload()}
                className="w-full rounded-2xl px-4 py-3 text-sm font-semibold text-white"
                style={{ background: "var(--re-primary)" }}
              >
                Refresh
              </button>

              <button
                onClick={handleLogout}
                className="w-full rounded-2xl border border-[var(--re-border)] bg-white/60 px-4 py-3 text-sm font-semibold hover:bg-white/80"
              >
                Sign out
              </button>
            </div>
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

        {(error || showLinking || showConnected || showConnFailed) && (
          <div className="mt-3 flex items-center justify-between rounded-2xl border border-[var(--re-border)] bg-white/50 px-3 py-2 text-[11px]">
            <div className="text-[var(--re-muted)]">
              {error
                ? "Sync issue — some features may be limited."
                : showConnFailed
                ? "Connection issue — refresh."
                : showLinking
                ? "Connecting…"
                : "Connected"}
            </div>

            {!error && !showConnFailed ? (
              <span
                className="rounded-full px-2 py-0.5 font-semibold text-white"
                style={{ background: brandGradient }}
              >
                Connected
              </span>
            ) : (
              <button
                onClick={() => window.location.reload()}
                className="rounded-full border border-[var(--re-border)] bg-white/70 px-2 py-0.5 font-semibold hover:bg-white/90"
              >
                Refresh
              </button>
            )}
          </div>
        )}

        {/* Balance */}
        <div className="mt-4 rounded-3xl border border-[var(--re-border)] bg-[var(--re-card)] p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xs text-[var(--re-muted)]">Account balance</div>
              <div className="mt-2 text-3xl font-semibold tracking-tight">
                {balLoading ? "Loading…" : formatUSD(usdAmount)}
              </div>
              <div className="mt-1 text-xs text-[var(--re-muted)]">
                {balLoading
                  ? "Fetching latest rate"
                  : `${formatEth(ethAmount)} • ${
                      ethPriceUsd ? `$${ethPriceUsd.toFixed(2)} / ETH` : "—"
                    }`}
              </div>
              {balError ? (
                <div className="mt-2 text-xs text-red-700">{balError}</div>
              ) : null}
            </div>

            <button
              onClick={loadBalance}
              disabled={balLoading}
              className="rounded-2xl px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
              style={{ background: brandGradient }}
              title="Refresh balance"
            >
              <span className="inline-flex items-center gap-2">
                <RefreshCcw className="h-4 w-4" />
                Refresh
              </span>
            </button>
          </div>
        </div>

        {/* Core Actions */}
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

        {/* Wallet (RemittEase UI first, Magic widget on demand) */}
        <div className="mt-4 rounded-3xl border border-[var(--re-border)] bg-[var(--re-card)] p-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-[var(--re-muted)]">Wallet</div>
              <div className="mt-1 text-sm font-semibold">{shortAddr(address)}</div>
            </div>

            <button
              onClick={handleCopy}
              className="rounded-full border border-[var(--re-border)] bg-white/70 px-4 py-2 text-xs font-semibold hover:bg-white/90"
            >
              {copied ? "Copied" : "Copy"}
            </button>
          </div>

          <div className="mt-3 text-xs text-[var(--re-muted)]">
            Your embedded wallet is created automatically when you sign in.
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <button
              onClick={openWalletUI}
              className="rounded-2xl px-3 py-3 text-left text-sm font-semibold text-white"
              style={{ background: brandGradient }}
            >
              <span className="inline-flex items-center gap-2">
                <Wallet className="h-4 w-4" />
                Open Wallet
              </span>
              <div className="mt-1 text-xs opacity-90">Full wallet experience</div>
            </button>

            <button
              onClick={openOnRamp}
              className="rounded-2xl border border-[var(--re-border)] bg-white/70 px-3 py-3 text-left hover:bg-white/90"
            >
              <span className="inline-flex items-center gap-2 text-sm font-semibold">
                <Coins className="h-4 w-4" />
                Buy Crypto
              </span>
              <div className="mt-1 text-xs text-[var(--re-muted)]">Top up in-wallet</div>
            </button>

            <button
              onClick={openSendUI}
              className="rounded-2xl border border-[var(--re-border)] bg-white/70 px-3 py-3 text-left hover:bg-white/90"
            >
              <span className="inline-flex items-center gap-2 text-sm font-semibold">
                <ExternalLink className="h-4 w-4" />
                Send in Wallet
              </span>
              <div className="mt-1 text-xs text-[var(--re-muted)]">Magic send UI</div>
            </button>

            <button
              onClick={openBalancesUI}
              className="rounded-2xl border border-[var(--re-border)] bg-white/70 px-3 py-3 text-left hover:bg-white/90"
            >
              <span className="inline-flex items-center gap-2 text-sm font-semibold">
                <Coins className="h-4 w-4" />
                Balances
              </span>
              <div className="mt-1 text-xs text-[var(--re-muted)]">Token balances</div>
            </button>

            <button
              onClick={openAddressQR}
              className="col-span-2 rounded-2xl border border-[var(--re-border)] bg-white/70 px-3 py-3 text-left hover:bg-white/90"
            >
              <span className="inline-flex items-center gap-2 text-sm font-semibold">
                <QrCode className="h-4 w-4" />
                Show QR Code
              </span>
              <div className="mt-1 text-xs text-[var(--re-muted)]">
                Let someone scan to pay you
              </div>
            </button>
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