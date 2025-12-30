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
 * The issue: Thirdweb embedded/enclave wallets need significant time to complete 
 * their internal authentication with thirdweb's backend before they can sign messages.
 * The 401 errors from `sign-typed-data` indicate the enclave session isn't ready.
 * 
 * This hook:
 * 1. Waits an initial delay for the enclave to initialize
 * 2. Polls for an existing token (in case SDK's AccountEventProvider succeeded)
 * 3. Retries SIWE authentication with longer intervals
 */
function useSiweAuth() {
  const { siweAuth } = usePanna();
  const wallet = useActiveWallet();
  const account = useActiveAccount();
  
  const [isReady, setIsReady] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attemptCount, setAttemptCount] = useState(0);
  const isMountedRef = useRef(true);
  const authInProgressRef = useRef(false);
  
  // Configuration - give thirdweb enclave plenty of time to initialize
  const initialDelayMs = 3000;  // Wait 3 seconds before first attempt
  const retryDelayMs = 1500;    // 1.5 seconds between retries
  const maxAttempts = 15;       // Up to ~25 seconds total

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
      if (!currentAccount) {
        console.debug("SIWE: No account available yet");
        return false;
      }

      // Check if this is a smart account (ecosystem wallet with account abstraction)
      const config = currentWallet.getConfig() as { smartAccount?: unknown };
      const isSmartAccount = !!config?.smartAccount;

      console.debug("SIWE: Generating payload...");
      
      // Generate SIWE payload from the API
      const payload = await siweAuth.generatePayload({
        address: currentAccount.address,
      });

      // Build EIP-4361 message
      const message = buildSiweMessage(payload);

      console.debug("SIWE: Signing message...");
      
      // Sign the message - this is where 401 errors occur if enclave isn't ready
      const signature = await currentAccount.signMessage({ message });

      console.debug("SIWE: Verifying with API...");
      
      // Verify with the API
      const success = await siweAuth.login({
        payload,
        signature,
        account: currentAccount,
        isSafeWallet: isSmartAccount,
      });

      if (success) {
        console.debug("SIWE: Authentication successful!");
      }
      
      return success;
    } catch (err) {
      // 401 errors are expected when thirdweb enclave isn't ready yet
      if (err instanceof Error && err.message.includes("401")) {
        console.debug("SIWE: Enclave not ready yet (401), will retry...");
        return false;
      }
      // Log other errors but don't treat as fatal - might recover on retry
      console.warn("SIWE auth attempt failed:", err);
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
      setAttemptCount(0);
      authInProgressRef.current = false;
      return;
    }

    // Check if we already have a valid token
    const existingToken = siweAuth.getValidAuthToken();
    if (existingToken) {
      console.debug("SIWE: Valid token already exists");
      setIsReady(true);
      setIsAuthenticating(false);
      return;
    }

    // Need wallet to attempt authentication
    if (!wallet) {
      return;
    }

    // Prevent concurrent auth attempts
    if (authInProgressRef.current) {
      return;
    }
    authInProgressRef.current = true;

    // Start authentication process
    setIsAuthenticating(true);
    setError(null);
    setAttemptCount(0);

    const authenticate = async () => {
      console.debug(`SIWE: Starting authentication, waiting ${initialDelayMs}ms for enclave...`);
      
      // Initial delay - give thirdweb enclave time to fully initialize
      await new Promise((resolve) => setTimeout(resolve, initialDelayMs));
      
      if (!isMountedRef.current) return;

      // Check if token became available during initial wait
      const tokenAfterWait = siweAuth.getValidAuthToken();
      if (tokenAfterWait) {
        console.debug("SIWE: Token became available during initial wait");
        setIsReady(true);
        setIsAuthenticating(false);
        authInProgressRef.current = false;
        return;
      }

      let attempts = 0;
      
      while (attempts < maxAttempts && isMountedRef.current) {
        attempts++;
        setAttemptCount(attempts);
        
        console.debug(`SIWE: Attempt ${attempts}/${maxAttempts}`);
        
        // Check if token became available (e.g., from SDK's AccountEventProvider)
        const token = siweAuth.getValidAuthToken();
        if (token) {
          console.debug("SIWE: Token found from another source");
          if (isMountedRef.current) {
            setIsReady(true);
            setIsAuthenticating(false);
          }
          authInProgressRef.current = false;
          return;
        }

        // Attempt SIWE authentication
        const success = await attemptSiweAuth(wallet);
        if (success) {
          if (isMountedRef.current) {
            setIsReady(true);
            setIsAuthenticating(false);
          }
          authInProgressRef.current = false;
          return;
        }

        // Wait before retrying
        if (attempts < maxAttempts) {
          await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
        }
      }

      // All attempts exhausted
      console.error("SIWE: All authentication attempts failed");
      if (isMountedRef.current) {
        setIsAuthenticating(false);
        setError("Unable to establish secure session. Please disconnect and try again.");
      }
      authInProgressRef.current = false;
    };

    authenticate();
  }, [account, wallet, siweAuth, attemptSiweAuth]);

  return { isReady, isAuthenticating, error, attemptCount, maxAttempts };
}

export default function DepositPage() {
  const router = useRouter();
  const account = useActiveAccount();
  const { isReady, isAuthenticating, error, attemptCount, maxAttempts } = useSiweAuth();

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
                    <div className="mt-2 text-xs text-[var(--re-muted)]">
                      Setting up your secure wallet connection.
                      {attemptCount > 0 && (
                        <span className="ml-1">
                          (Attempt {attemptCount}/{maxAttempts})
                        </span>
                      )}
                    </div>
                    {/* Progress bar */}
                    <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-gray-200">
                      <div 
                        className="h-full bg-black transition-all duration-500"
                        style={{ width: `${(attemptCount / maxAttempts) * 100}%` }}
                      />
                    </div>
                  </>
                ) : error ? (
                  <div className="space-y-3">
                    <div className="text-xs text-red-600">{error}</div>
                    <button
                      onClick={forceReauth}
                      className="w-full rounded-full bg-black px-4 py-3 text-sm font-semibold text-white"
                    >
                      Disconnect & Try Again
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