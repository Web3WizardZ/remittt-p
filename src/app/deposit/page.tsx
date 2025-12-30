"use client";

import AnimatedBackground from "@/components/animated-background";
import {
  BuyForm,
  ConnectButton,
  useActiveAccount,
  useActiveWallet,
  useConnectedAccounts,
  useLogout,
  usePanna,
} from "panna-sdk/react";
import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

/**
 * Build an EIP-4361 compliant SIWE message from a login payload
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
  
  if (payload.statement) {
    message += `\n\n${payload.statement}`;
  }
  
  message += `\n\nURI: ${payload.uri}`;
  message += `\nVersion: ${payload.version}`;
  message += `\nChain ID: ${payload.chainId}`;
  message += `\nNonce: ${payload.nonce}`;
  message += `\nIssued At: ${payload.issuedAt}`;
  
  if (payload.expirationTime) {
    message += `\nExpiration Time: ${payload.expirationTime}`;
  }
  if (payload.notBefore) {
    message += `\nNot Before: ${payload.notBefore}`;
  }
  if (payload.requestId) {
    message += `\nRequest ID: ${payload.requestId}`;
  }
  if (payload.resources && payload.resources.length > 0) {
    message += "\nResources:";
    for (const resource of payload.resources) {
      message += `\n- ${resource}`;
    }
  }
  
  return message;
}

/**
 * Custom hook that handles SIWE authentication with retry logic.
 * 
 * The issue: Thirdweb embedded wallets need time to complete their internal 
 * authentication with thirdweb's enclave service before they can sign messages.
 * The AccountEventProvider attempts SIWE immediately on connect, which often
 * fails with a 401 error because the wallet isn't ready yet.
 * 
 * This hook polls for an existing token AND retries SIWE authentication
 * if no token is found.
 */
function useSiweAuth() {
  const { siweAuth } = usePanna();
  const wallet = useActiveWallet();
  const account = useActiveAccount();
  
  const [isReady, setIsReady] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const attemptCountRef = useRef(0);
  const isMountedRef = useRef(true);
  
  const maxAttempts = 12; // ~10 seconds total with 800ms delay
  const retryDelayMs = 800;

  /**
   * Attempts SIWE authentication by generating a payload, signing it,
   * and verifying with the Panna API.
   */
  const attemptSiweAuth = useCallback(async (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    currentWallet: any
  ): Promise<boolean> => {
    try {
      const currentAccount = currentWallet.getAccount();
      if (!currentAccount) return false;

      // Check if this is a smart account (ecosystem wallet with account abstraction)
      const config = currentWallet.getConfig() as { smartAccount?: unknown };
      const isSmartAccount = !!config?.smartAccount;

      // Generate SIWE payload from the API
      const payload = await siweAuth.generatePayload({
        address: currentAccount.address,
      });

      // Build EIP-4361 message
      const message = buildSiweMessage(payload);

      // Sign the message
      const signature = await currentAccount.signMessage({ message });

      // Verify with the API
      const success = await siweAuth.login({
        payload,
        signature,
        account: currentAccount,
        isSafeWallet: isSmartAccount,
      });

      return success;
    } catch (err) {
      // 401 errors are expected when wallet isn't ready yet
      if (err instanceof Error && err.message.includes("401")) {
        console.debug("SIWE: Wallet not ready yet (401), will retry...");
        return false;
      }
      console.error("SIWE auth error:", err);
      return false;
    }
  }, [siweAuth]);

  useEffect(() => {
    isMountedRef.current = true;
    
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    // Reset state when account disconnects
    if (!account) {
      setIsReady(false);
      setIsAuthenticating(false);
      setError(null);
      attemptCountRef.current = 0;
      return;
    }

    // Check if we already have a valid token
    const existingToken = siweAuth.getValidAuthToken();
    if (existingToken) {
      setIsReady(true);
      setIsAuthenticating(false);
      return;
    }

    // Need wallet to attempt authentication
    if (!wallet) {
      return;
    }

    // Start authentication process
    setIsAuthenticating(true);
    setError(null);
    attemptCountRef.current = 0;

    const authenticate = async () => {
      while (attemptCountRef.current < maxAttempts && isMountedRef.current) {
        attemptCountRef.current++;
        
        // First, check if token became available (e.g., from AccountEventProvider)
        const token = siweAuth.getValidAuthToken();
        if (token) {
          if (isMountedRef.current) {
            setIsReady(true);
            setIsAuthenticating(false);
          }
          return;
        }

        // Attempt SIWE authentication
        const success = await attemptSiweAuth(wallet);
        if (success) {
          if (isMountedRef.current) {
            setIsReady(true);
            setIsAuthenticating(false);
          }
          return;
        }

        // Wait before retrying
        await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
      }

      // All attempts exhausted
      if (isMountedRef.current) {
        setIsAuthenticating(false);
        setError("Failed to establish secure session. Please reconnect your wallet.");
      }
    };

    authenticate();
  }, [account, wallet, siweAuth, attemptSiweAuth]);

  return { isReady, isAuthenticating, error };
}

export default function DepositPage() {
  const router = useRouter();
  const account = useActiveAccount();
  const { isReady, isAuthenticating, error } = useSiweAuth();

  const connected = useConnectedAccounts();
  const { disconnect } = useLogout();

  const stepperRef = useRef<any>(null);

  const forceReauth = () => {
    const active = connected?.[0];
    if (active) disconnect(active);
  };

  return (
    <main className="relative min-h-screen">
      <AnimatedBackground />
      <div className="mx-auto min-h-screen w-full max-w-md px-5 py-8">
        <div className="rounded-3xl border border-[var(--re-border)] bg-[var(--re-card)] p-6 shadow-[0_20px_70px_rgba(0,0,0,0.15)]">
          <div className="text-lg font-semibold">Deposit</div>
          <div className="text-sm text-[var(--re-muted)]">
            Add funds to your RemittEase balance
          </div>

          <div className="mt-6 space-y-4">
            {!account ? (
              <div className="panna-surface">
                <ConnectButton />
              </div>
            ) : !isReady ? (
              <div className="rounded-2xl border border-[var(--re-border)] bg-white/70 p-4">
                {isAuthenticating ? (
                  <>
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-black" />
                      <div className="text-sm font-semibold">
                        Securing your session…
                      </div>
                    </div>
                    <div className="mt-1 text-xs text-[var(--re-muted)]">
                      This usually takes a moment after you sign in.
                    </div>
                  </>
                ) : error ? (
                  <div className="space-y-3">
                    <div className="text-xs text-red-600">{error}</div>
                    <button
                      onClick={forceReauth}
                      className="w-full rounded-full bg-black px-4 py-3 text-sm font-semibold text-white"
                    >
                      Reconnect
                    </button>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="panna-surface">
                <BuyForm
                  onClose={() => router.push("/account")}
                  stepperRef={stepperRef}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}