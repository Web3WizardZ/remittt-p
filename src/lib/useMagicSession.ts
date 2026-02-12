"use client";

import { useEffect, useState } from "react";
import { getMagic } from "@/lib/magic";

type Session =
  | { status: "loading" }
  | { status: "anon" }
  | { status: "authed"; address: string; email?: string | null };

type InfoWithAddress = { publicAddress?: string; email?: string | null };

export function useMagicSession(): Session {
  const [session, setSession] = useState<Session>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const magic = getMagic();
        if (!magic) {
          if (!cancelled) setSession({ status: "anon" });
          return;
        }

        const loggedIn = await magic.user.isLoggedIn();
        if (!loggedIn) {
          if (!cancelled) setSession({ status: "anon" });
          return;
        }

        const info = (await magic.user.getInfo()) as unknown as InfoWithAddress;
        const address = info?.publicAddress;

        if (!address) {
          if (!cancelled) setSession({ status: "anon" });
          return;
        }

        if (!cancelled) {
          setSession({ status: "authed", address, email: info.email ?? null });
        }
      } catch {
        if (!cancelled) setSession({ status: "anon" });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return session;
}
