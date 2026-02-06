"use client";

import AnimatedBackground from "@/components/animated-background";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, Clock3, XCircle, ArrowLeft, Copy } from "lucide-react";

function shortHash(h: string) {
  if (!h) return "";
  return `${h.slice(0, 10)}…${h.slice(-8)}`;
}

type DepositStatus = "pending" | "completed" | "failed" | "cancelled" | "expired" | "unknown";

function normalizeStatus(raw?: string | null): DepositStatus {
  const s = (raw ?? "").toLowerCase().trim();
  if (s === "pending" || s === "processing") return "pending";
  if (s === "completed" || s === "success" || s === "succeeded") return "completed";
  if (s === "failed" || s === "error") return "failed";
  if (s === "cancelled" || s === "canceled") return "cancelled";
  if (s === "expired") return "expired";
  return "unknown";
}

export default function DepositStatusClient() {
  const router = useRouter();
  const params = useSearchParams();

  const statusFromUrl = normalizeStatus(params.get("status"));
  const sessionIdFromUrl = params.get("sessionId") || params.get("session_id") || "";
  const txHashFromUrl = params.get("txHash") || params.get("tx_hash") || params.get("transaction_hash") || "";
  const messageFromUrl = params.get("message") || "";

  const [fallbackSessionId, setFallbackSessionId] = useState("");
  const [fallbackTxHash, setFallbackTxHash] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    // Optional: if your onramp provider stores anything locally, keep a fallback
    if (!sessionIdFromUrl) {
      const stored = localStorage.getItem("re_last_deposit_session_id") || "";
      setFallbackSessionId(stored);
    }
    if (!txHashFromUrl) {
      const storedTx = localStorage.getItem("re_last_deposit_tx_hash") || "";
      setFallbackTxHash(storedTx);
    }
  }, [sessionIdFromUrl, txHashFromUrl]);

  const sessionId = useMemo(() => sessionIdFromUrl || fallbackSessionId, [sessionIdFromUrl, fallbackSessionId]);
  const txHash = useMemo(() => txHashFromUrl || fallbackTxHash, [txHashFromUrl, fallbackTxHash]);

  const ui = useMemo(() => {
    if (statusFromUrl === "completed") {
      return {
        title: "Deposit received",
        desc: "Your balance will update shortly.",
        icon: CheckCircle2,
        tone: "ok",
      } as const;
    }

    if (statusFromUrl === "failed") {
      return {
        title: "Deposit failed",
        desc: messageFromUrl || "Something went wrong. Please try again.",
        icon: XCircle,
        tone: "bad",
      } as const;
    }

    if (statusFromUrl === "cancelled") {
      return {
        title: "Deposit cancelled",
        desc: "No changes were made.",
        icon: XCircle,
        tone: "bad",
      } as const;
    }

    if (statusFromUrl === "expired") {
      return {
        title: "Session expired",
        desc: "Start a new deposit to continue.",
        icon: XCircle,
        tone: "bad",
      } as const;
    }

    if (statusFromUrl === "pending") {
      return {
        title: "Processing deposit…",
        desc: "Complete the payment to finish. If you already paid, it can take a few minutes to reflect.",
        icon: Clock3,
        tone: "wait",
      } as const;
    }

    // unknown
    return {
      title: "Checking deposit…",
      desc: "If you don’t see an update soon, start a new deposit or contact support.",
      icon: Clock3,
      tone: "wait",
    } as const;
  }, [statusFromUrl, messageFromUrl]);

  async function copy(text: string) {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(text);
      setTimeout(() => setCopied(null), 1000);
    } catch {
      // ignore
    }
  }

  const Icon = ui.icon;

  return (
    <main className="relative min-h-screen">
      <AnimatedBackground />

      <div className="mx-auto min-h-screen w-full max-w-md px-5 py-8">
        <button
          onClick={() => router.push("/account")}
          className="inline-flex items-center gap-2 rounded-full border border-[var(--re-border)] bg-white/70 px-4 py-2 text-sm font-semibold hover:bg-white/90"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to account
        </button>

        <div className="mt-6 rounded-3xl border border-[var(--re-border)] bg-[var(--re-card)] p-6 shadow-[0_20px_70px_rgba(0,0,0,0.15)]">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-white/70 p-3 ring-1 ring-black/5">
              <Icon className="h-6 w-6" />
            </div>
            <div>
              <div className="text-lg font-semibold">{ui.title}</div>
              <div className="mt-1 text-sm text-[var(--re-muted)]">{ui.desc}</div>
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-[var(--re-border)] bg-white/70 p-4 space-y-4">
            <div>
              <div className="text-xs text-[var(--re-muted)]">Status</div>
              <div className="mt-2 text-sm font-semibold">
                {statusFromUrl === "unknown" ? "Unknown" : statusFromUrl}
              </div>
            </div>

            <div>
              <div className="text-xs text-[var(--re-muted)]">Session</div>
              <div className="mt-2 flex items-center justify-between gap-3">
                <div className="text-sm font-semibold break-all">{sessionId || "—"}</div>
                {sessionId ? (
                  <button
                    onClick={() => copy(sessionId)}
                    className="rounded-full border border-[var(--re-border)] bg-white/70 px-3 py-2 text-xs font-semibold hover:bg-white/90"
                    title="Copy session id"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                ) : null}
              </div>
              {copied === sessionId ? (
                <div className="mt-1 text-xs text-[var(--re-muted)]">Copied ✓</div>
              ) : null}
            </div>

            <div>
              <div className="text-xs text-[var(--re-muted)]">Transaction</div>
              <div className="mt-2 flex items-center justify-between gap-3">
                <div className="text-sm font-semibold break-all">{txHash ? shortHash(txHash) : "—"}</div>
                {txHash ? (
                  <button
                    onClick={() => copy(txHash)}
                    className="rounded-full border border-[var(--re-border)] bg-white/70 px-3 py-2 text-xs font-semibold hover:bg-white/90"
                    title="Copy transaction hash"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                ) : null}
              </div>
              {copied === txHash ? (
                <div className="mt-1 text-xs text-[var(--re-muted)]">Copied ✓</div>
              ) : null}
            </div>
          </div>

          {statusFromUrl === "unknown" ? (
            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
              No provider status was supplied. If you’re integrating an onramp, redirect back here with
              <span className="font-semibold"> ?status=pending|completed|failed</span>.
            </div>
          ) : null}

          <button
            onClick={() => router.push("/deposit")}
            className="mt-5 w-full rounded-full bg-gradient-to-r from-[var(--re-primary)] to-[var(--re-accent)] px-5 py-3 text-sm font-semibold text-white hover:opacity-95"
          >
            Start another deposit
          </button>
        </div>
      </div>
    </main>
  );
}
