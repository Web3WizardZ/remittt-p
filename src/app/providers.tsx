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
        const mod: any = await import("panna-sdk");
        const PannaProvider =
          mod?.PannaProvider ??
          mod?.default?.PannaProvider ??
          mod?.default ??
          null;

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

  const ctxValue = useMemo<PannaState>(() => ({ ready: !!ProviderComp, error }), [ProviderComp, error]);

  // If provider failed to load, still render app shell (so you can see UI)
  if (!ProviderComp) {
    return <PannaCtx.Provider value={ctxValue}>{children}</PannaCtx.Provider>;
  }

  // Best-effort config (extra props will typically be ignored if unsupported)
  return (
    <PannaCtx.Provider value={ctxValue}>
      <div className="panna-surface">
        <ProviderComp
          partnerId={env.NEXT_PUBLIC_PARTNER_ID}
          clientId={env.NEXT_PUBLIC_CLIENT_ID}
          chainId={env.NEXT_PUBLIC_CHAIN_ID}
          appName={env.NEXT_PUBLIC_APP_NAME}
          appDescription={env.NEXT_PUBLIC_APP_DESCRIPTION}
          theme={{
            mode: "light",
            accentColor: "#7C3AED",
            overlay: "rgba(15, 23, 42, 0.55)",
            borderRadius: 18,
          }}
        >
          {children}
        </ProviderComp>
      </div>
    </PannaCtx.Provider>
  );
}
