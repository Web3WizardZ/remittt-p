"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMagicSession } from "@/lib/useMagicSession";

export default function AuthClient() {
  const router = useRouter();
  const session = useMagicSession();

  useEffect(() => {
    if (session.status === "authed") router.replace("/account");
  }, [session.status, router]);

  if (session.status === "loading") {
    return <div className="min-h-screen" />; // or spinner
  }

  if (session.status === "authed") return null; // redirecting

  // ✅ render your login UI here
  return <div>Auth UI…</div>;
}
