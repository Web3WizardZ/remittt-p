"use client";

import { BuyForm } from "panna-sdk/react";
import { useRef } from "react";

export default function DepositModal({
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
      {/* overlay */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* modal */}
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
        </div>
      </div>
    </div>
  );
}
