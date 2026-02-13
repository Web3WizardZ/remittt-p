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
    const addr = await waitForEvmAddress(magic); // no opts
    if (addr && typeof addr === "string" && addr.startsWith("0x")) return addr;
    await sleep(delayMs);
  }
  return null;
}

export default function AccountClient() {
  const router = useRouter();

  // If getMagic() throws (env missing), it can crash render.
  // We guard it so you SEE the error instead of a blank page.
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
    "init" | "check-login" | "get-info" | "auth" | "get-address" | "done"
  >("init");

  const [address, setAddress] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [issuer, setIssuer] = useState<string>("");

  const [copied, setCopied] = useState(false);
  const [linkStatus, setLinkStatus] = useState<
    "idle" | "linking" | "linked" | "failed"
  >("idle");

  const [error, setError] = useState<string>("");

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

        setPhase("auth");
        let resolvedIssuer = "";
        let idToken: string | null = null;

        try {
          idToken = await magic.user.getIdToken();

          const res = await fetch("/api/auth", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ idToken }),
          });

          if (!res.ok) {
            const txt = await res.text().catch(() => "");
            throw new Error(`Auth route failed: ${res.status} ${txt}`);
          }

          const data = await res.json();
          resolvedIssuer = data?.issuer ?? "";
          if (!cancelled) setIssuer(resolvedIssuer);
        } catch (e: any) {
          // Not fatal for wallet display, but we surface it.
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

          // Client-side linking (immediate reflect)
          if (resolvedIssuer) {
            try {
              setLinkStatus("linking");
              localStorage.setItem(`re_wallet_${resolvedIssuer}`, addr);
              setLinkStatus("linked");
            } catch {
              setLinkStatus("failed");
            }
          }

          // If you created /api/account/wallet route, persist best-effort
          // (won't break UI if missing)
          if (idToken) {
            try {
              await fetch("/api/account/wallet", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ idToken, address: addr }),
              });
            } catch {
              // ignore
            }
          }
        } else {
          // Still provisioning
          setAddress("");
        }

        setPhase("done");
      } catch (e: any) {
        if (!cancelled) {
          setError(e?.message ?? "Unknown error on account page");
        }
      } finally {
        if (!cancelled) setReady(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [magic, magicInitError, router]);

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

  // ✅ Always show something (no more blank screen)
  if (!ready) {
    return (
      <main className="relative min-h-screen">
        <AnimatedBackground />
        <div className="mx-auto min-h-screen w-full max-w-md px-5 py-8">
          <div className="rounded-3xl border border-[var(--re-border)] bg-[var(--re-card)] p-6 shadow-[0_20px_70px_rgba(0,0,0,0.15)]">
            <div className="text-lg font-semibold">Loading account…</div>
            <div className="mt-2 text-sm text-[var(--re-muted)]">
              Step: <span className="font-mono">{phase}</span>
            </div>

            {(magicInitError || error) && (
              <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-800">
                <div className="font-semibold">Debug</div>
                {magicInitError && <div className="mt-1">Magic: {magicInitError}</div>}
                {error && <div className="mt-1">Error: {error}</div>}
              </div>
            )}

            <button
              onClick={() => window.location.reload()}
              className="re-btn mt-5"
            >
              Refresh
            </button>
          </div>
        </div>
      </main>
    );
  }

  // Logged in but address still not available
  if (ready && !address) {
    return (
      <main className="relative min-h-screen">
        <AnimatedBackground />

        <div className="mx-auto min-h-screen w-full max-w-md px-5 py-8">
          <div className="rounded-3xl border border-[var(--re-border)] bg-[var(--re-card)] p-6 shadow-[0_20px_70px_rgba(0,0,0,0.15)]">
            <div className="text-lg font-semibold">Finishing setup…</div>
            <div className="mt-2 text-sm text-[var(--re-muted)]">
              Wallet still provisioning. Step:{" "}
              <span className="font-mono">{phase}</span>
            </div>

            {error && (
              <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-800">
                <div className="font-semibold">Debug</div>
                <div className="mt-1">{error}</div>
              </div>
            )}

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

  const headerSub = email
    ? `Signed in as ${email}`
    : issuer
      ? `User ${issuer.slice(0, 10)}…`
      : `Wallet ${shortAddr(address)}`;

  const showLinked =
    issuer && linkStatus === "linked" ? "✅ Wallet linked to account" : "";
  const showLinking =
    issuer && linkStatus === "linking" ? "Linking wallet to account…" : "";
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

        {/* Debug / status strip */}
        {(error || showLinked || showLinking || showFailed) && (
          <div className="mt-3 rounded-2xl border border-[var(--re-border)] bg-white/60 px-4 py-3 text-xs">
            {(showLinked || showLinking || showFailed) && (
              <div className="font-semibold">
                {showLinked || showLinking || showFailed}
              </div>
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
