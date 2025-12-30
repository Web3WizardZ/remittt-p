import * as Dialog from "@radix-ui/react-dialog";
import { BuyForm } from "panna-sdk/react";
import { useRef } from "react";

function DepositModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const stepperRef = useRef<any>(null);

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" />

        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-50 w-[92%] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-[var(--re-border)] bg-[var(--re-card)] p-6 shadow-[0_30px_90px_rgba(0,0,0,0.25)] outline-none"
        >
          {/* Our header (friendly + consistent) */}
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-lg font-semibold">Deposit</div>
              <div className="text-sm text-[var(--re-muted)]">
                Add funds to your RemittEase balance
              </div>
            </div>

            <Dialog.Close asChild>
              <button className="rounded-full border border-[var(--re-border)] bg-white/70 px-4 py-2 text-xs font-semibold hover:bg-white/90">
                Close
              </button>
            </Dialog.Close>
          </div>

          {/* Panna flow (now inside a real Dialog context) */}
          <div className="mt-5 panna-surface">
            <BuyForm onClose={onClose} stepperRef={stepperRef} />
          </div>

          <p className="mt-3 text-center text-xs text-[var(--re-muted)]">
            If the provider popup doesn’t open, disable popup blockers for this site.
          </p>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
