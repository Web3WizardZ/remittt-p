"use client";

import React, { createContext, useEffect, useMemo, useState } from "react";
import { env } from "@/lib/env";

type PannaState = { ready: boolean; error?: string };
export const PannaCtx = createContext<PannaState>({ ready: false });

export default function Providers({ children }: { children: React.ReactNode }) {
  const [ProviderComp, setProviderComp] = useState<any>(null);
  const [error, setError] = useState<string | undefined>(undefined);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        // Prefer the react entry (common for SDK UI/providers)
        let mod: any;
        try {
          mod = await import("panna-sdk/react");
        } catch {
          mod = await import("panna-sdk");
        }

        const PannaProvider =
          mod?.PannaProvider ?? mod?.default?.PannaProvider ?? mod?.default ?? null;

        if (!mounted) return;

        if (!PannaProvider) {
          setError("PannaProvider not found in panna-sdk exports.");
          return;
        }

        setProviderComp(() => PannaProvider);
      } catch (e: any) {
        if (!mounted) return;
        setError(e?.message ?? "Failed to load panna-sdk");
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const ctxValue = useMemo<PannaState>(
    () => ({ ready: !!ProviderComp, error }),
    [ProviderComp, error]
  );

  // Render shell even if provider fails (so you can still see UI)
  if (!ProviderComp) {
    return <PannaCtx.Provider value={ctxValue}>{children}</PannaCtx.Provider>;
  }

  return (
    <PannaCtx.Provider value={ctxValue}>
      <div className="panna-surface">
        <ProviderComp
          partnerId={env.NEXT_PUBLIC_PARTNER_ID}
          clientId={env.NEXT_PUBLIC_CLIENT_ID}
          chainId={String(env.NEXT_PUBLIC_CHAIN_ID)} // MUST be string in 0.3.0-beta.1
        >
          {children}
        </ProviderComp>
      </div>
    </PannaCtx.Provider>
  );
}
