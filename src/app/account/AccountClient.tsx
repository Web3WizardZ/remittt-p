"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMagicSession } from "@/lib/useMagicSession";

export default function AccountClient() {
  const router = useRouter();
  const session = useMagicSession();

  useEffect(() => {
    if (session.status === "anon") router.replace("/auth");
  }, [session.status, router]);

  if (session.status === "loading") {
    return <div className="min-h-screen" />; // or your spinner
  }

  if (session.status === "anon") {
    return null; // redirecting
  }

  const address = session.address;

  // ✅ render your account page using `address`
  return <div>Logged in: {address}</div>;
}
