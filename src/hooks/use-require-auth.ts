// hooks/use-require-auth.ts
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useActiveAccount, usePanna } from "panna-sdk/react";

/**
 * Hook to ensure user is fully authenticated (wallet + SIWE).
 * Redirects to /auth if either is missing.
 * 
 * Usage:
 * ```tsx
 * function ProtectedPage() {
 *   const { isReady, address } = useRequireAuth();
 *   
 *   if (!isReady) return <LoadingSpinner />;
 *   
 *   return <YourContent />;
 * }
 * ```
 */
export function useRequireAuth() {
  const router = useRouter();
  const account = useActiveAccount();
  const { siweAuth } = usePanna();
  
  const address = account?.address ?? null;
  const hasValidToken = siweAuth.getValidAuthToken() !== null;
  const isReady = !!address && hasValidToken;

  useEffect(() => {
    // No wallet connected
    if (!address) {
      router.replace("/auth");
      return;
    }

    // Wallet connected but SIWE token missing/expired
    if (!hasValidToken) {
      router.replace("/auth");
      return;
    }
  }, [address, hasValidToken, router]);

  return { 
    isReady, 
    address,
    hasValidToken 
  };
}

/**
 * Hook for pages that only need wallet connection (not SIWE).
 * Use this for pages that don't make authenticated API calls.
 */
export function useRequireWallet() {
  const router = useRouter();
  const account = useActiveAccount();
  
  const address = account?.address ?? null;

  useEffect(() => {
    if (!address) {
      router.replace("/auth");
    }
  }, [address, router]);

  return { 
    isReady: !!address, 
    address 
  };
}