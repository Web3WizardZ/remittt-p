"use client";

import AnimatedBackground from "@/components/animated-background";
import { motion } from "framer-motion";
import Image from "next/image";
import { ConnectButton, useActiveAccount, useActiveWallet, usePanna } from "panna-sdk/react";
import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";

/**
 * Build an EIP-4361 compliant SIWE message
 */
function buildSiweMessage(payload: {
  domain: string;
  address: string;
  uri: string;
  version: string;
  chainId: number;
  nonce: string;
  issuedAt: string;
  statement?: string;
  expirationTime?: string;
  notBefore?: string;
  requestId?: string;
  resources?: string[];
}): string {
  let message = `${payload.domain} wants you to sign in with your Ethereum account:\n${payload.address}`;
  if (payload.statement) message += `\n\n${payload.statement}`;
  message += `\n\nURI: ${payload.uri}`;
  message += `\nVersion: ${payload.version}`;
  message += `\nChain ID: ${payload.chainId}`;
  message += `\nNonce: ${payload.nonce}`;
  message += `\nIssued At: ${payload.issuedAt}`;
  if (payload.expirationTime) message += `\nExpiration Time: ${payload.expirationTime}`;
  if (payload.notBefore) message += `\nNot Before: ${payload.notBefore}`;
  if (payload.requestId) message += `\nRequest ID: ${payload.requestId}`;
  if (payload.resources?.length) {
    message += "\nResources:";
    payload.resources.forEach(r => message += `\n- ${r}`);
  }
  return message;
}

type AuthState = "idle" | "connected" | "authenticating" | "ready" | "error";

export default function AuthPage() {
  const router = useRouter();
  const activeAccount = useActiveAccount();
  const activeWallet = useActiveWallet();
  const { siweAuth } = usePanna();
  
  const [authState, setAuthState] = useState<AuthState>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const authAttemptedRef = useRef(false);
  const isMountedRef = useRef(true);

  // SIWE authentication function
  const performSiweAuth = useCallback(async (wallet: any): Promise<boolean> => {
    try {
      const account = wallet.getAccount();
      if (!account) return false;

      const config = wallet.getConfig() as { smartAccount?: unknown };
      const isSmartAccount = !!config?.smartAccount;

      const payload = await siweAuth.generatePayload({ address: account.address });
      const message = buildSiweMessage(payload);
      const signature = await account.signMessage({ message });

      return await siweAuth.login({
        payload,
        signature,
        account,
        isSafeWallet: isSmartAccount,
      });
    } catch (err) {
      if (err instanceof Error && err.message.includes("401")) {
        return false; // Enclave not ready, will retry
      }
      console.error("SIWE auth error:", err);
      return false;
    }
  }, [siweAuth]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  useEffect(() => {
    // No account = show connect button
    if (!activeAccount?.address || !activeWallet) {
      setAuthState("idle");
      authAttemptedRef.current = false;
      return;
    }

    // Already have valid SIWE token = redirect immediately
    if (siweAuth.getValidAuthToken()) {
      router.replace("/account");
      return;
    }

    // Prevent duplicate auth attempts
    if (authAttemptedRef.current) return;
    authAttemptedRef.current = true;

    setAuthState("authenticating");
    setErrorMsg(null);

    const authenticate = async () => {
      // Initial delay for thirdweb enclave to initialize
      await new Promise(r => setTimeout(r, 2000));
      
      if (!isMountedRef.current) return;

      // Check if token appeared during wait
      if (siweAuth.getValidAuthToken()) {
        router.replace("/account");
        return;
      }

      // Retry loop
      const maxAttempts = 20;
      const delayMs = 1500;

      for (let i = 0; i < maxAttempts; i++) {
        if (!isMountedRef.current) return;

        // Check for token from SDK's AccountEventProvider
        if (siweAuth.getValidAuthToken()) {
          router.replace("/account");
          return;
        }

        const success = await performSiweAuth(activeWallet);
        if (success) {
          if (isMountedRef.current) {
            router.replace("/account");
          }
          return;
        }

        await new Promise(r => setTimeout(r, delayMs));
      }

      // All attempts failed
      if (isMountedRef.current) {
        setAuthState("error");
        setErrorMsg(
          "Unable to complete sign-in. Please check that:\n" +
          "• Third-party cookies are enabled\n" +
          "• No browser extensions are blocking requests\n\n" +
          "Try refreshing the page or using a different browser."
        );
      }
    };

    authenticate();
  }, [activeAccount?.address, activeWallet, siweAuth, router, performSiweAuth]);

  return (
    <main className="relative min-h-screen">
      <AnimatedBackground />

      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 py-8">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55 }}
          className="rounded-3xl border border-[var(--re-border)] bg-[var(--re-card)] p-6 shadow-[0_20px_70px_rgba(17,24,39,0.15)]"
        >
          <div className="flex flex-col items-center text-center">
            <div className="h-14 w-14 overflow-hidden rounded-2xl bg-white/80 ring-1 ring-black/10">
              <Image 
                src="/logo.png" 
                alt="RemittEase" 
                width={56} 
                height={56} 
                className="h-full w-full object-contain p-2" 
                priority 
              />
            </div>

            <div className="mt-4 text-xl font-semibold">Welcome to RemittEase</div>
            <div className="mt-1 text-sm text-[var(--re-muted)]">
              Cross-border payments, done properly.
            </div>
          </div>

          <div className="mt-7">
            {authState === "idle" && (
              <div className="panna-surface">
                <ConnectButton
                  connectButton={{ title: "Continue" }}
                  connectDialog={{
                    title: "Sign in",
                    description: "Secure access in a few seconds.",
                    otpTitle: "Enter code",
                    otpDescription: "Use the code we sent you.",
                  }}
                />
              </div>
            )}

            {authState === "authenticating" && (
              <div className="rounded-2xl border border-[var(--re-border)] bg-white/70 p-5 text-center">
                <div className="mx-auto h-8 w-8 animate-spin rounded-full border-3 border-gray-200 border-t-black" />
                <div className="mt-4 text-sm font-semibold">Completing sign-in...</div>
                <div className="mt-1 text-xs text-[var(--re-muted)]">
                  Setting up your secure session
                </div>
              </div>
            )}

            {authState === "error" && (
              <div className="space-y-4">
                <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
                  <div className="whitespace-pre-line text-xs text-red-700">
                    {errorMsg}
                  </div>
                </div>
                <button
                  onClick={() => window.location.reload()}
                  className="w-full rounded-full bg-black px-4 py-3 text-sm font-semibold text-white"
                >
                  Try Again
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </main>
  );
}