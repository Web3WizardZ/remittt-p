"use client";

import React, { createContext, useEffect, useMemo, useState } from "react";
import { env } from "@/lib/env";

type PannaState = {
  ready: boolean;
  error?: string;
  LoginButton?: React.ComponentType<any>;
};

export const PannaCtx = createContext<PannaState>({ ready: false });

export default function Providers({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [LoginButton, setLoginButton] = useState<React.ComponentType<any> | undefined>(undefined);
  const [error, setError] = useState<string | undefined>(undefined);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const mod: any = await import("panna-sdk");

        // Prefer LoginButton; fallback to ConnectButton
        const Btn = mod?.LoginButton ?? mod?.ConnectButton ?? null;

        if (!mounted) return;

        if (!Btn) {
          setError("panna-sdk loaded, but no LoginButton/ConnectButton export was found.");
          setReady(false);
          return;
        }

        setLoginButton(() => Btn);
        setReady(true);
      } catch (e: any) {
        if (!mounted) return;
        setError(e?.message ?? "Failed to load panna-sdk");
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const ctxValue = useMemo(() => ({ ready, error, LoginButton }), [ready, error, LoginButton]);

  return <PannaCtx.Provider value={ctxValue}>{children}</PannaCtx.Provider>;
}
