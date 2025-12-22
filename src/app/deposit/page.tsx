"use client";

import AnimatedBackground from "@/components/animated-background";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  useActiveAccount,
  useCreateOnrampSession,
  useOnrampQuotes,
  useSupportedTokens,
} from "panna-sdk/react";
import { FiatCurrency } from "panna-sdk/core";
import { ArrowLeft, CreditCard, ShieldCheck } from "lucide-react";

const NETWORK = "lisk";
const PREFERRED = ["USDC", "USDT", "ETH", "LSK"] as const;

function formatMoney(amount: number, currency: FiatCurrency) {
  const locale = currency === FiatCurrency.ZAR ? "en-ZA" : "en-US";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

function toNumberSafe(v: string) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export default function DepositPage() {
  const router = useRouter();
  const activeAccount = useActiveAccount();
  const address = activeAccount?.address ?? "";

  // Default deposit currency: USD
  const [currency, setCurrency] = useState<FiatCurrency>(FiatCurrency.USD);
  const [amount, setAmount] = useState<string>("50");
  const [tokenSymbol, setTokenSymbol] = useState<string>("USDC");
  const [uiError, setUiError] = useState<string | null>(null);

  const { data: supportedTokens = [], isLoading: tokensLoading } = useSupportedTokens();
  const preferredTokens = useMemo(() => {
    const map = new Map(supportedTokens.map((t) => [t.symbol?.toUpperCase(), t]));
    return PREFERRED.map((s) => map.get(s)).filter(Boolean) as { symbol: string; name: string }[];
  }, [supportedTokens]);

  useEffect(() => {
    // If preferred list doesn’t include our default, pick the first available
    if (!preferredTokens.length) return;
    const has = preferredTokens.some((t) => t.symbol?.toUpperCase() === tokenSymbol.toUpperCase());
    if (!has) setTokenSymbol(preferredTokens[0].symbol);
  }, [preferredTokens, tokenSymbol]);

  useEffect(() => {
    if (!address) router.replace("/auth");
  }, [address, router]);

  const fiatAmount = useMemo(() => toNumberSafe(amount), [amount]);

  const {
    data: quote,
    isLoading: quoteLoading,
    error: quoteError,
  } = useOnrampQuotes({
    tokenSymbol,
    network: NETWORK,
    fiatAmount,
    fiatCurrency: currency,
  });

  const { mutateAsync: createSession, isPending: creatingSession, error: sessionError } =
    useCreateOnrampSession();

  async function handleContinue() {
    setUiError(null);

    try {
      if (!fiatAmount || fiatAmount <= 0) {
        setUiError("Enter an amount greater than 0.");
        return;
      }
      if (!tokenSymbol) {
        setUiError("Select a token.");
        return;
      }

      const session = await createSession({
        tokenSymbol,
        network: NETWORK,
        fiatAmount,
        fiatCurrency: currency,
        quoteData: quote,
        // return back to app after checkout
        redirectUrl: "/deposit/status",
      });

      // Fallback in case provider doesn’t append it to callback URL
      localStorage.setItem("re_last_onramp_session_id", session.session_id);
      localStorage.setItem("re_last_onramp_token", tokenSymbol);
      localStorage.setItem("re_last_onramp_currency", currency);
      localStorage.setItem("re_last_onramp_amount", String(fiatAmount));

      window.location.href = session.redirect_url;
    } catch (e: any) {
      setUiError(e?.message ?? "Could not start deposit.");
    }
  }

  return (
    <main className="relative min-h-screen">
      <AnimatedBackground />

      <div className="mx-auto min-h-screen w-full max-w-md px-5 py-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.push("/account")}
            className="inline-flex items-center gap-2 rounded-full border border-[var(--re-border)] bg-white/70 px-4 py-2 text-sm font-semibold hover:bg-white/90"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>

          <div className="text-sm font-semibold text-[var(--re-muted)]">Deposit</div>
        </div>

        {/* Main card */}
        <div className="mt-6 relative overflow-hidden rounded-3xl border border-[var(--re-border)] bg-[var(--re-card)] p-6 shadow-[0_20px_70px_rgba(0,0,0,0.15)]">
          {/* faint logo watermark */}
          <div className="pointer-events-none absolute right-[-22px] top-1/2 -translate-y-1/2 opacity-[0.08]">
            <Image src="/logo.png" alt="" width={220} height={220} className="rotate-[10deg]" />
          </div>

          <div className="relative">
            <div className="text-lg font-semibold">Add funds</div>
            <div className="mt-1 text-sm text-[var(--re-muted)]">
              Choose an amount, then continue to secure checkout.
            </div>

            {/* Currency toggle */}
            <div className="mt-5 flex rounded-full border border-[var(--re-border)] bg-white/60 p-1 w-fit">
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

            {/* Amount */}
            <div className="mt-4">
              <div className="text-xs text-[var(--re-muted)]">Amount</div>
              <div className="mt-2 flex items-center gap-2 rounded-2xl border border-[var(--re-border)] bg-white/70 px-4 py-3">
                <span className="text-sm font-semibold">{currency}</span>
                <input
                  value={amount}
                  onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))}
                  inputMode="decimal"
                  placeholder="50"
                  className="w-full bg-transparent text-sm font-semibold outline-none"
                />
              </div>
            </div>

            {/* Token selection */}
            <div className="mt-4">
              <div className="text-xs text-[var(--re-muted)]">Buy into</div>

              <div className="mt-2 grid grid-cols-4 gap-2">
                {(preferredTokens.length ? preferredTokens : supportedTokens.slice(0, 4)).map((t) => {
                  const sym = (t.symbol || "").toUpperCase();
                  const active = sym === tokenSymbol.toUpperCase();
                  return (
                    <button
                      key={sym}
                      onClick={() => setTokenSymbol(sym)}
                      className={`rounded-2xl border px-3 py-3 text-center text-xs font-semibold ${
                        active
                          ? "border-transparent bg-white text-black shadow-[0_10px_30px_rgba(0,0,0,0.08)]"
                          : "border-[var(--re-border)] bg-white/60 text-[var(--re-muted)] hover:bg-white/80"
                      }`}
                      disabled={tokensLoading}
                    >
                      {sym}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quote */}
            <div className="mt-5 rounded-2xl border border-[var(--re-border)] bg-white/70 p-4">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold">Quote</div>
                <div className="text-xs text-[var(--re-muted)]">
                  {quoteLoading ? "Refreshing…" : quote ? `Valid ~${quote.quote_validity_mins} min` : "—"}
                </div>
              </div>

              <div className="mt-3 space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-[var(--re-muted)]">You pay</span>
                  <span className="font-semibold">
                    {fiatAmount > 0 ? formatMoney(fiatAmount, currency) : "—"}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[var(--re-muted)]">You receive</span>
                  <span className="font-semibold">
                    {quote ? `${quote.crypto_quantity} ${tokenSymbol}` : "—"}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[var(--re-muted)]">Fees</span>
                  <span className="font-semibold">
                    {quote ? formatMoney(Number(quote.onramp_fee || 0), currency) : "—"}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[var(--re-muted)]">Total</span>
                  <span className="font-semibold">
                    {quote ? formatMoney(Number(quote.total_fiat_amount || fiatAmount), currency) : "—"}
                  </span>
                </div>
              </div>
            </div>

            {/* Errors */}
            {(uiError || quoteError?.message || sessionError?.message) ? (
              <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                {uiError || quoteError?.message || sessionError?.message}
              </div>
            ) : null}

            {/* Continue */}
            <button
              onClick={handleContinue}
              disabled={creatingSession || !quote || fiatAmount <= 0}
              className="mt-5 w-full rounded-full bg-gradient-to-r from-[var(--re-primary)] to-[var(--re-accent)] px-5 py-3 text-sm font-semibold text-white hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {creatingSession ? "Opening checkout…" : "Continue"}
            </button>

            {/* Trust line */}
            <div className="mt-4 flex items-center justify-center gap-2 text-xs text-[var(--re-muted)]">
              <ShieldCheck className="h-4 w-4" />
              <span>Secure checkout</span>
              <span className="opacity-50">•</span>
              <CreditCard className="h-4 w-4" />
              <span>Card / bank where available</span>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
