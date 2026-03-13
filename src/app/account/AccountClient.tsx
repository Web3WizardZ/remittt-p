// src/app/account/AccountClient.tsx
"use client";

import AnimatedBackground from "@/components/animated-background";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Connection, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { ethers } from "ethers";
import { getMagic, CHAIN_RPC } from "@/lib/magic";
import {
  getEvmAddressSafe,
  getSolanaAddressSafe,
  switchEvmChainSafe,
} from "@/lib/magicSession";
import {
  ArrowUpRight,
  ArrowDownLeft,
  Plus,
  UserRound,
  RefreshCcw,
  ChevronDown,
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

function formatNative(n: number, symbol: string) {
  if (!Number.isFinite(n)) return `— ${symbol}`;
  return `${new Intl.NumberFormat("en-US", {
    maximumFractionDigits: n >= 1 ? 4 : 6,
  }).format(n)} ${symbol}`;
}

type Phase =
  | "init"
  | "check-login"
  | "get-info"
  | "validate"
  | "get-address"
  | "done";

type NetworkType = "evm" | "solana";

type Network = {
  id: string;
  type: NetworkType;
  name: string;
  chainId?: number;
  nativeSymbol: string;
  rpcUrl?: string;
};

const NETWORKS: Network[] = [
  {
    id: "eth",
    type: "evm",
    name: "Ethereum",
    chainId: 1,
    nativeSymbol: "ETH",
    rpcUrl: CHAIN_RPC.ETHEREUM,
  },
  {
    id: "polygon",
    type: "evm",
    name: "Polygon",
    chainId: 137,
    nativeSymbol: "MATIC",
    rpcUrl: CHAIN_RPC.POLYGON,
  },
  {
    id: "optimism",
    type: "evm",
    name: "Optimism",
    chainId: 10,
    nativeSymbol: "ETH",
    rpcUrl: CHAIN_RPC.OPTIMISM,
  },
  {
    id: "base",
    type: "evm",
    name: "Base",
    chainId: 8453,
    nativeSymbol: "ETH",
    rpcUrl: CHAIN_RPC.BASE,
  },
  {
    id: "arbitrum",
    type: "evm",
    name: "Arbitrum",
    chainId: 42161,
    nativeSymbol: "ETH",
    rpcUrl: CHAIN_RPC.ARBITRUM,
  },
  {
    id: "solana",
    type: "solana",
    name: "Solana",
    nativeSymbol: "SOL",
    rpcUrl: CHAIN_RPC.SOLANA,
  },
];

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

  const [network, setNetwork] = useState<Network>(() => {
    const saved =
      typeof window !== "undefined"
        ? window.localStorage.getItem("re_network")
        : null;
    const found = saved ? NETWORKS.find((n) => n.id === saved) : null;
    return found ?? NETWORKS[0];
  });
  const [switching, setSwitching] = useState(false);

  const [evmAddress, setEvmAddress] = useState("");
  const [solAddress, setSolAddress] = useState("");
  const activeAddress = network.type === "solana" ? solAddress : evmAddress;

  const [email, setEmail] = useState("");
  const [issuer, setIssuer] = useState("");

  const [copied, setCopied] = useState(false);
  const [linkStatus, setLinkStatus] = useState<
    "idle" | "linking" | "linked" | "failed"
  >("idle");

  const [syncError, setSyncError] = useState("");
  const [notice, setNotice] = useState("");

  const [balLoading, setBalLoading] = useState(false);
  const [balError, setBalError] = useState("");
  const [nativeAmount, setNativeAmount] = useState(0);
  const [usdAmount, setUsdAmount] = useState(0);
  const [nativePriceUsd, setNativePriceUsd] = useState(0);

  const [openingWidget, setOpeningWidget] = useState<
    null | "send" | "receive" | "deposit"
  >(null);

  const brandGradient =
    "linear-gradient(135deg, #4f46e5 0%, #a855f7 45%, #ec4899 100%)";

  const flashNotice = (msg: string) => {
    setNotice(msg);
    window.setTimeout(() => setNotice(""), 3200);
  };

  const handleLogout = async () => {
    if (!magic) return;
    await magic.user.logout();
    router.replace("/auth");
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(activeAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {}
  };

  async function loadEvmBalanceReadOnly() {
    if (!network.chainId || !network.rpcUrl || !evmAddress) return;

    const provider = new ethers.JsonRpcProvider(network.rpcUrl, network.chainId);
    const balWei = await provider.getBalance(evmAddress);
    const native = Number(ethers.formatEther(balWei));

    const priceRes = await fetch(`/api/price/native?chainId=${network.chainId}`, {
      cache: "no-store",
    });
    const priceJson = await priceRes.json().catch(() => ({}));
    if (!priceRes.ok) throw new Error(priceJson?.error ?? "Price unavailable");

    const price = Number(priceJson?.usd ?? 0);
    const usd = native * price;

    setNativeAmount(native);
    setNativePriceUsd(price);
    setUsdAmount(usd);
  }

  async function loadSolanaBalanceReadOnly() {
    if (!network.rpcUrl || !solAddress) return;

    const connection = new Connection(network.rpcUrl, "confirmed");
    const lamports = await connection.getBalance(new PublicKey(solAddress));
    const native = lamports / LAMPORTS_PER_SOL;

    setNativeAmount(native);
    setNativePriceUsd(0);
    setUsdAmount(0);
  }

  const loadBalance = async () => {
    setBalLoading(true);
    setBalError("");

    try {
      if (network.type === "evm") {
        await loadEvmBalanceReadOnly();
      } else {
        await loadSolanaBalanceReadOnly();
      }
    } catch (e: any) {
      setBalError(e?.message ?? "Could not load balance");
      setNativeAmount(0);
      setUsdAmount(0);
      setNativePriceUsd(0);
    } finally {
      setBalLoading(false);
    }
  };

  const openAddressQR = async () => {
    if (!magic || openingWidget) return;

    if (network.type !== "evm") {
      flashNotice("QR widget is available on EVM networks.");
      return;
    }

    setOpeningWidget("receive");
    try {
      if (network.chainId) {
        await switchEvmChainSafe(magic, network.chainId);
      }
      await (magic as any).wallet?.showAddress?.();
    } catch (e: any) {
      flashNotice(e?.message ?? "Could not open QR");
    } finally {
      setOpeningWidget(null);
    }
  };

  const openSendUI = async () => {
    if (!magic || openingWidget) return;

    if (network.type !== "evm") {
      flashNotice("Send widget is available on EVM networks.");
      return;
    }

    setOpeningWidget("send");
    try {
      if (network.chainId) {
        await switchEvmChainSafe(magic, network.chainId);
      }
      await (magic as any).wallet?.showSendTokensUI?.();
    } catch (e: any) {
      flashNotice(e?.message ?? "Could not open Send");
    } finally {
      setOpeningWidget(null);
    }
  };

  const openOnRamp = async () => {
    if (!magic || openingWidget) return;

    if (network.type !== "evm" || !network.chainId) {
      flashNotice("Buy Crypto is available on Ethereum / Polygon.");
      return;
    }
    if (network.chainId !== 1 && network.chainId !== 137) {
      flashNotice("Buy Crypto is available on Ethereum / Polygon.");
      return;
    }

    setOpeningWidget("deposit");
    try {
      await switchEvmChainSafe(magic, network.chainId);
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
          if (!cancelled) {
            setSyncError(e?.message ?? "Failed to validate session");
          }
        }

        setPhase("get-address");

        const evmAddr = await getEvmAddressSafe(magic);
        if (!cancelled) setEvmAddress(evmAddr);

        const solAddr = await getSolanaAddressSafe(magic);
        if (!cancelled) setSolAddress(solAddr);

        if (cancelled) return;

        if (evmAddr && issuer) {
          try {
            setLinkStatus("linking");
            localStorage.setItem(`re_wallet_${issuer}`, evmAddr);
            setLinkStatus("linked");
          } catch {
            setLinkStatus("failed");
          }

          fetch("/api/account/wallet", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ idToken, address: evmAddr }),
          }).catch(() => {});
        }

        setPhase("done");
      } catch (e: any) {
        if (!cancelled) {
          setSyncError(e?.message ?? "Unknown error on account page");
        }
      } finally {
        if (!cancelled) {
          setReady(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [magic, magicInitError, router, issuer]);

  useEffect(() => {
    if (!magic) return;

    (async () => {
      try {
        setSwitching(true);
        setSyncError("");
        setBalError("");

        if (typeof window !== "undefined") {
          window.localStorage.setItem("re_network", network.id);
        }

        if (network.type === "evm" && network.chainId) {
          await switchEvmChainSafe(magic, network.chainId);
        }

        await loadBalance();
      } catch (e: any) {
        setSyncError(e?.message ?? "Network switch failed");
      } finally {
        setSwitching(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [network.id]);

  useEffect(() => {
    if (!ready) return;
    if (network.type === "evm" && !evmAddress) return;
    if (network.type === "solana" && !solAddress) return;
    loadBalance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, evmAddress, solAddress]);

  const showLinking = issuer && linkStatus === "linking";
  const showConnected = issuer && linkStatus === "linked";
  const showConnFailed = issuer && linkStatus === "failed";

  if (!ready) {
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
                <div className="text-lg font-semibold leading-tight">RemittEase</div>
                <div className="text-xs re-subtle">Getting things ready</div>
              </div>
            </div>

            <div className="mt-7">
              <div className="text-2xl font-semibold leading-tight tracking-tight">
                Loading your account…
              </div>
              <div className="mt-2 text-sm re-subtle">Almost there.</div>
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
        </div>
      </main>
    );
  }

  const headerSub = email ? `Signed in as ${email}` : "Signed in";

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

        <div className="mt-3 rounded-2xl border border-[var(--re-border)] bg-white/60 px-3 py-2">
          <div className="flex items-center justify-between">
            <div className="text-[11px] text-[var(--re-muted)]">
              Network {switching ? "• switching…" : ""}
            </div>
            <div className="relative">
              <select
                value={network.id}
                onChange={(e) => {
                  const next = NETWORKS.find((n) => n.id === e.target.value);
                  if (next) setNetwork(next);
                }}
                className="appearance-none rounded-xl border border-[var(--re-border)] bg-white/80 px-3 py-2 pr-9 text-sm font-semibold"
                disabled={switching}
              >
                {NETWORKS.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--re-muted)]" />
            </div>
          </div>
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

        <div className="mt-4 rounded-3xl border border-[var(--re-border)] bg-[var(--re-card)] p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xs text-[var(--re-muted)]">Account balance</div>

              <div className="mt-2 text-3xl font-semibold tracking-tight">
                {network.type === "evm"
                  ? balLoading
                    ? "Loading…"
                    : formatUSD(usdAmount)
                  : balLoading
                  ? "Loading…"
                  : "—"}
              </div>

              <div className="mt-1 text-xs text-[var(--re-muted)]">
                {balLoading
                  ? "Fetching latest rate"
                  : network.type === "evm"
                  ? `${formatNative(nativeAmount, network.nativeSymbol)} • ${
                      nativePriceUsd
                        ? `$${nativePriceUsd.toFixed(2)} / ${network.nativeSymbol}`
                        : "—"
                    }`
                  : `${formatNative(nativeAmount, network.nativeSymbol)} • USD price not added yet`}
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

        <div className="mt-4 grid grid-cols-3 gap-3">
          <button
            onClick={openSendUI}
            disabled={!!openingWidget || switching}
            className="rounded-2xl border border-[var(--re-border)] bg-white/70 px-3 py-4 text-center hover:bg-white/90 disabled:opacity-60"
          >
            <ArrowUpRight className="mx-auto h-5 w-5" />
            <div className="mt-2 text-sm font-semibold">Send</div>
            <div className="mt-1 text-xs text-[var(--re-muted)]">Transfer</div>
          </button>

          <button
            onClick={openAddressQR}
            disabled={!!openingWidget || switching}
            className="rounded-2xl border border-[var(--re-border)] bg-white/70 px-3 py-4 text-center hover:bg-white/90 disabled:opacity-60"
          >
            <ArrowDownLeft className="mx-auto h-5 w-5" />
            <div className="mt-2 text-sm font-semibold">Receive</div>
            <div className="mt-1 text-xs text-[var(--re-muted)]">Get paid</div>
          </button>

          <button
            onClick={openOnRamp}
            disabled={!!openingWidget || switching}
            className="rounded-2xl border border-[var(--re-border)] bg-white/70 px-3 py-4 text-center hover:bg-white/90 disabled:opacity-60"
          >
            <Plus className="mx-auto h-5 w-5" />
            <div className="mt-2 text-sm font-semibold">Deposit</div>
            <div className="mt-1 text-xs text-[var(--re-muted)]">Buy crypto</div>
          </button>
        </div>

        <div className="mt-4 rounded-3xl border border-[var(--re-border)] bg-[var(--re-card)] p-5">
          <div className="text-xs text-[var(--re-muted)]">Wallet address</div>

          <div className="mt-2 flex items-center justify-between gap-3">
            <div className="text-sm font-semibold">
              {activeAddress ? shortAddr(activeAddress) : "—"}
            </div>

            <button
              onClick={handleCopy}
              disabled={!activeAddress}
              className="rounded-full border border-[var(--re-border)] bg-white/70 px-4 py-2 text-xs font-semibold hover:bg-white/90 disabled:opacity-60"
            >
              {copied ? "Copied" : "Copy"}
            </button>
          </div>

          <div className="mt-3 text-xs text-[var(--re-muted)]">
            {network.type === "evm"
              ? "This is your embedded EVM wallet address."
              : "This is your embedded Solana wallet address."}
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