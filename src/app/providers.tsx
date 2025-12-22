"use client";

import React, { createContext, useMemo } from "react";
import { env } from "@/lib/env";
import { PannaProvider } from "panna-sdk/react";

type PannaState = { ready: boolean; error?: string };
export const PannaCtx = createContext<PannaState>({ ready: false });

export default function Providers({ children }: { children: React.ReactNode }) {
  const missing: string[] = [];
  if (!env.NEXT_PUBLIC_PARTNER_ID) missing.push("NEXT_PUBLIC_PARTNER_ID");
  if (!env.NEXT_PUBLIC_CLIENT_ID) missing.push("NEXT_PUBLIC_CLIENT_ID");
  if (!env.NEXT_PUBLIC_CHAIN_ID) missing.push("NEXT_PUBLIC_CHAIN_ID");

  const error = missing.length ? `Missing env: ${missing.join(", ")}` : undefined;
  const ctxValue = useMemo(() => ({ ready: !error, error }), [error]);

  if (error) return <PannaCtx.Provider value={ctxValue}>{children}</PannaCtx.Provider>;

  return (
    <PannaCtx.Provider value={ctxValue}>
      <div className="panna-surface">
        <PannaProvider
          partnerId={env.NEXT_PUBLIC_PARTNER_ID}
          clientId={env.NEXT_PUBLIC_CLIENT_ID}
          chainId={String(env.NEXT_PUBLIC_CHAIN_ID)} // string required in 0.3.0-beta.1
        >
          {children}
        </PannaProvider>
      </div>
    </PannaCtx.Provider>
  );
}
