// src/app/account/AccountClient.tsx
"use client";

import AnimatedBackground from "@/components/animated-background";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getMagic } from "@/lib/magic";
import { getEvmAddressSafe, getSolanaAddressSafe } from "@/lib/magicSession";
import { ethers } from "ethers";
import {
  ArrowUpRight,
  ArrowDownLeft,
  Plus,
  UserRound,
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
  const [solanaAddress, setSolanaAddress] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [issuer, setIssuer] = useState<string>("");

  const [copied, setCopied] = useState<"none" | "evm" | "sol">("none");
  const [linkStatus, setLinkStatus] = useState<
    "idle" | "linking" | "linked" | "failed"
  >("idle");

  const [syncError, setSyncError] = useState<string>("");
  const [notice, setNotice] = useState<string>("");

  // EVM Balance
  const [balLoading, setBalLoading] = useState(false);
  const [balError, setBalError] = useState("");
  const [ethAmount, setEthAmount] = useState(0);
  const [usdAmount, setUsdAmount] = useState(0);
  const [ethPriceUsd, setEthPriceUsd] = useState(0);

  const [openingWidget, setOpeningWidget] = useState<
    null | "send" | "receive" | "deposit"
  >(null);

  const brandGradient =
    "linear-gradient(135deg, #4f46e5 0%, #a855f7 45%, #ec4899 100%)";

  const handleLogout = async () => {
    if (!magic) return;
    await magic.user.logout();
    router.replace("/auth");
  };

  const copyText = async (value: string, type: "evm" | "sol") => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(type);
      window.setTimeout(() => setCopied("none"), 1200);
    } catch {}
  };

  const loadBalance = async () => {
    if (!magic || !address) return;

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

  const flashNotice = (msg: string) => {
    setNotice(msg);
    window.setTimeout(() => setNotice(""), 3000);
  };

  // Widget UI actions (EVM widget)
  const openAddressQR = async () => {
    if (!magic) return;
    if (openingWidget) return;

    setOpeningWidget("receive");
    try {
      await (magic as any).wallet?.showAddress?.();
    } catch (e: any) {
      flashNotice(e?.message ?? "Could not open QR");
    } finally {
      setOpeningWidget(null);
    }
  };

  const openSendUI = async () => {
    if (!magic) return;
    if (openingWidget) return;

    setOpeningWidget("send");
    try {
      await (magic as any).wallet?.showSendTokensUI?.();
    } catch (e: any) {
      flashNotice(e?.message ?? "Could not open Send");
    } finally {
      setOpeningWidget(null);
    }
  };

  const openOnRamp = async () => {
    if (!magic) return;
    if (openingWidget) return;

    setOpeningWidget("deposit");
    try {
      await (magic as any).wallet?.showOnRamp?.();
    } catch (e: any) {
      try {
        await (magic as any).wallet?.showUI?.();
        flashNotice("Buy Crypto is not enabled yet — opened Wallet instead.");
      } catch {
        flashNotice(
          e?.message ??
            "Buy Crypto is unavailable. Enable Widget UI + On-ramp in Magic dashboard."
        );
      }
    } finally {
      setOpeningWidget(null);
    }
  };

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        if (!magic) {
          setSyncError(magicInitError || "Magic is not initialized");
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
        let validatedIssuer = "";
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
          validatedIssuer = String(data?.issuer ?? "");
          if (!cancelled) setIssuer(validatedIssuer);
        } catch (e: any) {
          if (!cancelled) {
            setSyncError(e?.message ?? "Failed to validate session");
          }
        }

        setPhase("get-address");
        const [evmAddr, solAddr] = await Promise.all([
          getEvmAddressSafe(magic),
          getSolanaAddressSafe(magic),
        ]);

        if (cancelled) return;

        setAddress(evmAddr || "");
        setSolanaAddress(solAddr || "");

        try {
          if (validatedIssuer && (evmAddr || solAddr)) {
            setLinkStatus("linking");
            localStorage.setItem(
              `re_wallet_${validatedIssuer}`,
              JSON.stringify({
                evmAddress: evmAddr || "",
                solanaAddress: solAddr || "",
              })
            );
            setLinkStatus("linked");
          }
        } catch {
          setLinkStatus("failed");
        }

        fetch("/api/account/wallet", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            idToken,
            evmAddress: evmAddr || "",
            solanaAddress: solAddr || "",
          }),
        }).catch(() => {});

        setPhase("done");
      } catch (e: any) {
        if (!cancelled) {
          setSyncError(e?.message ?? "Unknown error on account page");
        }
      } finally {
        if (!cancelled) setReady(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [magic, magicInitError, router]);

  useEffect(() => {
    if (!magic || !address) return;
    loadBalance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [magic, address]);

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
        ? "Setting up your wallets…"
        : "Loading your account…";

    const subtitle =
      phase === "check-login"
        ? "Just a moment while we verify you."
        : phase === "get-info"
        ? "Fetching your profile details."
        : phase === "validate"
        ? "Confirming your secure session."
        : phase === "get-address"
        ? "Creating your embedded wallet addresses."
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

            {(magicInitError || syncError) && (
              <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                <div className="font-semibold">We hit a snag</div>
                <div className="mt-1">
                  Please refresh the page. If it keeps happening, sign out and try again.
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

  if (ready && !address && !solanaAddress) {
    return (
      <main className="relative min-h-screen">
        <AnimatedBackground />
        <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 py-10">
          <div className="re-card rounded-3xl p-7">
            <div className="text-2xl font-semibold">Finalizing your wallets…</div>
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

  const headerSub = email
    ? `Signed in as ${email}`
    : address
    ? `EVM ${shortAddr(address)}`
    : solanaAddress
    ? `Solana ${shortAddr(solanaAddress)}`
    : "Wallet loading";

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

        {(syncError || showLinking || showConnected || showConnFailed) && (
          <div className="mt-3 flex items-center justify-between rounded-2xl border border-[var(--re-border)] bg-white/50 px-3 py-2 text-[11px]">
            <div className="text-[var(--re-muted)]">
              {syncError
                ? "Sync issue — some features may be limited."
                : showConnFailed
                ? "Connection issue — refresh."
                : showLinking
                ? "Connecting…"
                : "Connected"}
            </div>

            {syncError || showConnFailed ? (
              <button
                onClick={() => window.location.reload()}
                className="rounded-full border border-[var(--re-border)] bg-white/70 px-2 py-0.5 font-semibold hover:bg-white/90"
              >
                Refresh
              </button>
            ) : (
              <span
                className="rounded-full px-2 py-0.5 font-semibold text-white"
                style={{ background: brandGradient }}
              >
                Connected
              </span>
            )}
          </div>
        )}

        {notice ? (
          <div className="mt-3 rounded-2xl border border-[var(--re-border)] bg-white/70 px-3 py-2 text-xs text-[var(--re-muted)]">
            {notice}
          </div>
        ) : null}

        {/* EVM Balance */}
        <div className="mt-4 rounded-3xl border border-[var(--re-border)] bg-[var(--re-card)] p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xs text-[var(--re-muted)]">EVM wallet balance</div>
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
              {balError ? <div className="mt-2 text-xs text-red-700">{balError}</div> : null}
            </div>

            <button
              onClick={loadBalance}
              disabled={balLoading || !address}
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

        {/* EVM Widget Actions */}
        <div className="mt-4 grid grid-cols-3 gap-3">
          <button
            onClick={openSendUI}
            disabled={!!openingWidget || !address}
            className="rounded-2xl border border-[var(--re-border)] bg-white/70 px-3 py-4 text-center hover:bg-white/90 disabled:opacity-60"
          >
            <ArrowUpRight className="mx-auto h-5 w-5" />
            <div className="mt-2 text-sm font-semibold">Send</div>
            <div className="mt-1 text-xs text-[var(--re-muted)]">Transfer</div>
          </button>

          <button
            onClick={openAddressQR}
            disabled={!!openingWidget || !address}
            className="rounded-2xl border border-[var(--re-border)] bg-white/70 px-3 py-4 text-center hover:bg-white/90 disabled:opacity-60"
          >
            <ArrowDownLeft className="mx-auto h-5 w-5" />
            <div className="mt-2 text-sm font-semibold">Receive</div>
            <div className="mt-1 text-xs text-[var(--re-muted)]">Get paid</div>
          </button>

          <button
            onClick={openOnRamp}
            disabled={!!openingWidget || !address}
            className="rounded-2xl border border-[var(--re-border)] bg-white/70 px-3 py-4 text-center hover:bg-white/90 disabled:opacity-60"
          >
            <Plus className="mx-auto h-5 w-5" />
            <div className="mt-2 text-sm font-semibold">Deposit</div>
            <div className="mt-1 text-xs text-[var(--re-muted)]">Buy crypto</div>
          </button>
        </div>

        {/* Wallets */}
        <div className="mt-4 rounded-3xl border border-[var(--re-border)] bg-[var(--re-card)] p-5">
          <div className="text-xs text-[var(--re-muted)]">Wallets</div>

          <div className="mt-4 space-y-4">
            <div>
              <div className="text-[11px] uppercase tracking-wide text-[var(--re-muted)]">
                EVM wallet
              </div>
              <div className="mt-2 flex items-center justify-between gap-3">
                <div className="text-sm font-semibold">
                  {address ? shortAddr(address) : "Not ready"}
                </div>

                {address ? (
                  <button
                    onClick={() => copyText(address, "evm")}
                    className="rounded-full border border-[var(--re-border)] bg-white/70 px-4 py-2 text-xs font-semibold hover:bg-white/90"
                  >
                    {copied === "evm" ? "Copied" : "Copy"}
                  </button>
                ) : null}
              </div>
            </div>

            <div>
              <div className="text-[11px] uppercase tracking-wide text-[var(--re-muted)]">
                Solana wallet
              </div>
              <div className="mt-2 flex items-center justify-between gap-3">
                <div className="text-sm font-semibold">
                  {solanaAddress ? shortAddr(solanaAddress) : "Not ready"}
                </div>

                {solanaAddress ? (
                  <button
                    onClick={() => copyText(solanaAddress, "sol")}
                    className="rounded-full border border-[var(--re-border)] bg-white/70 px-4 py-2 text-xs font-semibold hover:bg-white/90"
                  >
                    {copied === "sol" ? "Copied" : "Copy"}
                  </button>
                ) : null}
              </div>
            </div>
          </div>

          <div className="mt-3 text-xs text-[var(--re-muted)]">
            If a Solana address is shown above, the Solana wallet has been created.
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