"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { ReactNode } from "react";

export default function DepositModal({
  open,
  onOpenChange,
  children,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  children?: ReactNode;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" />

        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[92%] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-[var(--re-border)] bg-[var(--re-card)] p-6 shadow-[0_30px_90px_rgba(0,0,0,0.25)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <Dialog.Title className="text-lg font-semibold">Deposit</Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-[var(--re-muted)]">
                Add funds to your RemittEase balance.
              </Dialog.Description>
            </div>

            <Dialog.Close asChild>
              <button
                className="rounded-full border border-[var(--re-border)] bg-white/70 p-2 hover:bg-white/90"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </Dialog.Close>
          </div>

          <div className="mt-5 rounded-2xl border border-[var(--re-border)] bg-white/70 p-4 text-sm text-[var(--re-muted)]">
            Deposits are being updated to a new provider.
            <div className="mt-2 text-xs">
              If you’re integrating MoonPay/Ramp/Transak, you’ll plug the widget here.
            </div>
          </div>

          {children ? <div className="mt-5">{children}</div> : null}

          <div className="mt-5">
            <Dialog.Close asChild>
              <button className="w-full rounded-full bg-black px-5 py-3 text-sm font-semibold text-white hover:opacity-95">
                Close
              </button>
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
