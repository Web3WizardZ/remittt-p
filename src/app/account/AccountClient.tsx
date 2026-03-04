"use client";

import AnimatedBackground from "@/components/animated-background";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getMagic } from "@/lib/magic";
import { waitForEvmAddress } from "@/lib/magicSession";
import { ArrowUpRight, ArrowDownLeft, Plus, UserRound, RefreshCw } from "lucide-react";

function shortAddr(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-6)}`;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function forceEvmProvisioning(magic: any) {
  try {
    await magic?.rpcProvider?.request?.({ method: "eth_requestAccounts" });
  } catch {
    // ignore
  }
}

async function waitAddrWithRetries(magic: any, tries = 16, delayMs = 250) {
  for (let i = 0; i < tries; i++) {
    const addr = await waitForEvmAddress(magic);
    if (addr && typeof addr === "string" && addr.startsWith("0x")) return addr;
    await sleep(delayMs);
  }
  return "";
}

/** UI-safe conversion: wei (hex) -> native float */
function weiHexToNativeFloat(balHex: string) {
  const wei = BigInt(balHex);
  // We only display; JS float is fine for UI
  return Number(wei) / 1e18;
}

function formatUSD(n: number) {
  if (!Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: n >= 1000 ? 0 : 2,
  }).format(n);
}

function formatCrypto(n: number, symbol: string) {
  if (!Number.isFinite(n)) return `— ${symbol}`;
  const fmt = new Intl.NumberFormat("en-US", {
    maximumFractionDigits: n >= 1 ? 4 : 6,
  }).format(n);
  return `${fmt} ${symbol}`;
}

function chainMeta(chainId?: number): { symbol: string; coingeckoId: string } {
  if (!chainId) return { symbol: "ETH", coingeckoId: "ethereum" };

  // Ethereum family / L2s that use ETH as native gas
  if ([1, 11155111, 17000, 8453, 84532, 10, 420, 42161, 421614].includes(chainId)) {
    return { symbol: "ETH", coingeckoId: "ethereum" };
  }

  // Polygon (optional)
  if ([137, 80001, 80002].includes(chainId)) return { symbol: "MATIC", coingeckoId: "matic-network" };

  // Celo (optional)
  if ([42220, 44787].includes(chainId)) return { symbol: "CELO", coingeckoId: "celo" };

  // Default
  return { symbol: "ETH", coingeckoId: "ethereum" };
}

async function fetchUsdPrice(coingeckoId: string): Promise<number> {
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(
    coingeckoId
  )}&vs_currencies=usd`;

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error("Price unavailable");
  const data = await res.json();
  const p = data?.[coingeckoId]?.usd;
  if (typeof p !== "number") throw new Error("Price unavailable");
  return p;
}

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
  const [phase, setPhase] = useState<
    "init" | "check-login" | "get-info" | "validate" | "get-address" | "done"
  >("init");

  const [address, setAddress] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [issuer, setIssuer] = useState<string>("");

  const [copied, setCopied] = useState(false);
  const [linkStatus, setLinkStatus] = useState<"idle" | "linking" | "linked" | "failed">(
    "idle"
  );

  const [error, setError] = useState<string>("");

  // ---- Balance state ----
  const [balLoading, setBalLoading] = useState(false);
  const [balError, setBalError] = useState("");
  const [nativeSymbol, setNativeSymbol] = useState("ETH");
  const [nativeAmount, setNativeAmount] = useState<number>(0);
  const [usdAmount, setUsdAmount] = useState<number>(0);
  const [priceUsd, setPriceUsd] = useState<number>(0);

  const brandGradient = "linear-gradient(135deg, #4f46e5 0%, #a855f7 45%, #ec4899 100%)";

  // --------- Boot flow (login check -> issuer -> address) ----------
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
        } catch {
          // ok
        }

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

          const data = await res.json();
          if (!cancelled) setIssuer(data?.issuer ?? "");
        } catch (e: any) {
          if (!cancelled) setError(e?.message ?? "Failed to validate session");
        }

        setPhase("get-address");
        let addr = await waitAddrWithRetries(magic as any, 16, 250);

        if (!addr) {
          await forceEvmProvisioning(magic as any);
          addr = await waitAddrWithRetries(magic as any, 20, 300);
        }

        if (cancelled) return;

        if (addr) {
          setAddress(addr);

          // local reflect (optional)
          if (issuer) {
            try {
              setLinkStatus("linking");
              localStorage.setItem(`re_wallet_${issuer}`, addr);
              setLinkStatus("linked");
            } catch {
              setLinkStatus("failed");
            }
          }

          // best-effort save to backend
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
        if (!cancelled) setError(e?.message ?? "Unknown error on account page");
      } finally {
        if (!cancelled) setReady(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [magic, magicInitError, router, issuer]);

  // --------- Balance loader (native + USD) ----------
  const loadBalance = async () => {
    if (!magic || !address) return;

    setBalLoading(true);
    setBalError("");

    try {
      const provider = (magic as any).rpcProvider;

      // chain id
      const chainIdHex: string = await provider.request({ method: "eth_chainId" });
      const chainId = Number.parseInt(chainIdHex, 16);

      const meta = chainMeta(chainId);
      setNativeSymbol(meta.symbol);

      // native balance
      const balHex: string = await provider.request({
        method: "eth_getBalance",
        params: [address, "latest"],
      });

      const native = weiHexToNativeFloat(balHex);

      // price
      const p = await fetchUsdPrice(meta.coingeckoId);
      const usd = native * p;

      setNativeAmount(native);
      setPriceUsd(p);
      setUsdAmount(usd);
    } catch (e: any) {
      setBalError(e?.message ?? "Could not load balance");
      setNativeAmount(0);
      setUsdAmount(0);
      setPriceUsd(0);
    } finally {
      setBalLoading(false);
    }
  };

  useEffect(() => {
    if (!magic || !address) return;
    loadBalance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [magic, address]);

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

  // ---------- FRIENDLY LOADING SCREEN ----------
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
                <div className="text-lg font-semibold leading-tight">RemittEase</div>
                <div className="text-xs re-subtle">Getting things ready</div>
              </div>
            </div>

            <div className="mt-7">
              <div className="text-2xl font-semibold leading-tight tracking-tight">{title}</div>
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

                <details className="mt-4 text-xs text-red-900/80">
                  <summary className="cursor-pointer font-semibold">Technical details</summary>
                  <div className="mt-2 font-mono whitespace-pre-wrap">
                    {magicInitError ? `Magic: ${magicInitError}\n` : ""}
                    {error ? `Error: ${error}` : ""}
                  </div>
                </details>
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

  // ---------- FRIENDLY "FINISHING SETUP" SCREEN ----------
  if (ready && !address) {
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
                <div className="text-xs re-subtle">Almost ready</div>
              </div>
            </div>

            <div className="mt-7">
              <div className="text-2xl font-semibold leading-tight tracking-tight">
                Finalizing your wallet…
              </div>
              <div className="mt-2 text-sm re-subtle">
                This can take a few seconds the first time you sign in.
              </div>
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
                Please keep this page open.
              </div>
            </div>

            {error && (
              <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                <div className="font-semibold">Still setting things up</div>
                <div className="mt-1">
                  If this takes longer than a minute, refresh or sign out and try again.
                </div>
              </div>
            )}

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

  const headerSub = email
    ? `Signed in as ${email}`
    : issuer
    ? `User ${issuer.slice(0, 10)}…`
    : `Wallet ${shortAddr(address)}`;

  const showLinked = issuer && linkStatus === "linked" ? "✅ Wallet linked to account" : "";
  const showLinking = issuer && linkStatus === "linking" ? "Linking wallet to account…" : "";
  const showFailed =
    issuer && linkStatus === "failed"
      ? "⚠️ Could not save wallet locally (storage blocked)"
      : "";

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

        {/* Status strip */}
        {(error || showLinked || showLinking || showFailed) && (
          <div className="mt-3 rounded-2xl border border-[var(--re-border)] bg-white/60 px-4 py-3 text-xs">
            {(showLinked || showLinking || showFailed) && (
              <div className="font-semibold">{showLinked || showLinking || showFailed}</div>
            )}
            {issuer && (
              <div className="mt-1 text-[var(--re-muted)]">
                Issuer: <span className="font-mono">{issuer}</span>
              </div>
            )}
            {error && (
              <div className="mt-2 text-red-700">
                Error: <span className="font-mono">{error}</span>
              </div>
            )}
          </div>
        )}

        {/* Balance (USD) */}
        <div className="mt-4 rounded-3xl border border-[var(--re-border)] bg-[var(--re-card)] p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xs text-[var(--re-muted)]">Account balance</div>
              <div className="mt-2 text-3xl font-semibold tracking-tight">
                {balLoading ? "Loading…" : formatUSD(usdAmount)}
              </div>
              <div className="mt-1 text-xs text-[var(--re-muted)]">
                {balLoading ? "Fetching latest rate" : `${formatCrypto(nativeAmount, nativeSymbol)} • ${priceUsd ? `$${priceUsd.toFixed(2)} / ${nativeSymbol}` : "—"}`}
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
                <RefreshCw className={`h-4 w-4 ${balLoading ? "animate-spin" : ""}`} />
                Refresh
              </span>
            </button>
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