"use client";

import AnimatedBackground from "@/components/animated-background";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useOnrampSessionStatus } from "panna-sdk/react";
import { CheckCircle2, Clock3, XCircle, ArrowLeft, Copy } from "lucide-react";

function shortHash(h: string) {
  if (!h) return "";
  return `${h.slice(0, 10)}…${h.slice(-8)}`;
}

export default function DepositStatusClient() {
  const router = useRouter();
  const params = useSearchParams();

  const [fallbackSessionId, setFallbackSessionId] = useState<string>("");

  const sessionIdFromUrl = params.get("sessionId") || params.get("session_id") || "";

  useEffect(() => {
    if (sessionIdFromUrl) return;
    const stored = localStorage.getItem("re_last_onramp_session_id") || "";
    setFallbackSessionId(stored);
  }, [sessionIdFromUrl]);

  const sessionId = useMemo(
    () => sessionIdFromUrl || fallbackSessionId,
    [sessionIdFromUrl, fallbackSessionId]
  );

  const { data: status, isLoading, error } = useOnrampSessionStatus(
    { sessionId },
    { enabled: !!sessionId }
  );

  const ui = useMemo(() => {
    const s = status?.status;
    if (!s) return { title: "Checking deposit…", desc: "This can take a moment.", icon: Clock3 };

    if (s === "completed") return { title: "Deposit received", desc: "Your balance will update shortly.", icon: CheckCircle2 };
    if (s === "failed") return { title: "Deposit failed", desc: (status as any)?.error_message || "Please try again.", icon: XCircle };
    if (s === "cancelled") return { title: "Deposit cancelled", desc: "No changes were made.", icon: XCircle };
    if (s === "expired") return { title: "Session expired", desc: "Start a new deposit to continue.", icon: XCircle };

    return { title: "Processing deposit…", desc: "Complete the payment to finish.", icon: Clock3 };
  }, [status]);

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {}
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

          <div className="mt-5 rounded-2xl border border-[var(--re-border)] bg-white/70 p-4">
            <div className="text-xs text-[var(--re-muted)]">Session</div>
            <div className="mt-2 flex items-center justify-between gap-3">
              <div className="text-sm font-semibold break-all">{sessionId || "—"}</div>
              {sessionId ? (
                <button
                  onClick={() => copy(sessionId)}
                  className="rounded-full border border-[var(--re-border)] bg-white/70 px-3 py-2 text-xs font-semibold hover:bg-white/90"
                >
                  <Copy className="h-4 w-4" />
                </button>
              ) : null}
            </div>

            {(status as any)?.transaction_hash ? (
              <div className="mt-4">
                <div className="text-xs text-[var(--re-muted)]">Transaction</div>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <div className="text-sm font-semibold break-all">
                    {shortHash((status as any).transaction_hash)}
                  </div>
                  <button
                    onClick={() => copy((status as any).transaction_hash)}
                    className="rounded-full border border-[var(--re-border)] bg-white/70 px-3 py-2 text-xs font-semibold hover:bg-white/90"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ) : null}
          </div>

          {(error?.message || (!sessionId && !isLoading)) ? (
            <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
              {error?.message || "Missing session id. Start a new deposit."}
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
