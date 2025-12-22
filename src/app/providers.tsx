"use client";

import React from "react";
import { PannaProvider } from "panna-sdk/react";
import { chain } from "panna-sdk/core";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <PannaProvider
      clientId={process.env.NEXT_PUBLIC_CLIENT_ID}
      partnerId={process.env.NEXT_PUBLIC_PARTNER_ID}
      chainId={process.env.NEXT_PUBLIC_CHAIN_ID || String(chain.lisk.id)}
      enableDevMode={process.env.NEXT_PUBLIC_ENABLE_DEV_MODE === "true"}
      pannaApiUrl={process.env.NEXT_PUBLIC_PANNA_API_URL}
    >
      {children}
    </PannaProvider>
  );
}
