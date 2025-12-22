"use client";

import React, { createContext, useMemo } from "react";
import { env } from "@/lib/env";

// ✅ Use the React entry
import { PannaProvider } from "panna-sdk/react";

type PannaState = { ready: boolean; error?: string };
export const PannaCtx = createContext<PannaState>({ ready: false });

export default function Providers({ children }: { children: React.ReactNode }) {
  const missing: string[] = [];
  if (!env.NEXT_PUBLIC_PARTNER_ID) missing.push("NEXT_PUBLIC_PARTNER_ID");
  if (!env.NEXT_PUBLIC_CLIENT_ID) missing.push("NEXT_PUBLIC_CLIENT_ID");
  if (!env.NEXT_PUBLIC_CHAIN_ID) missing.push("NEXT_PUBLIC_CHAIN_ID");
  if (!env.NEXT_PUBLIC_APP_NAME) missing.push("NEXT_PUBLIC_APP_NAME");
  if (!env.NEXT_PUBLIC_APP_DESCRIPTION) missing.push("NEXT_PUBLIC_APP_DESCRIPTION");

  const error = missing.length ? `Missing env: ${missing.join(", ")}` : undefined;
  const ctxValue = useMemo<PannaState>(
    () => ({ ready: !error, error }),
    [error]
  );

  // If env is missing, still render UI shell
  if (error) {
    return <PannaCtx.Provider value={ctxValue}>{children}</PannaCtx.Provider>;
  }

  return (
    <PannaCtx.Provider value={ctxValue}>
      <PannaProvider
  partnerId={env.NEXT_PUBLIC_PARTNER_ID}
  clientId={env.NEXT_PUBLIC_CLIENT_ID}
  chainId={String(env.NEXT_PUBLIC_CHAIN_ID)}
>
  {children}
</PannaProvider>
    </PannaCtx.Provider>
  );
}
