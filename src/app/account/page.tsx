"use client";

import AnimatedBackground from "@/components/animated-background";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import {
  getEnvironmentChain,
  useAccountBalance,
  useActiveAccount,
  useConnectedAccounts,
  useLogout,
  usePanna,
  useSocialAccounts,
  useUserProfiles,
} from "panna-sdk/react";

export default function AccountPage() {
  const router = useRouter();
  const { disconnect } = useLogout();
  const connectedAccounts = useConnectedAccounts();
  const activeAccount = useActiveAccount();
  const { client, chainId } = usePanna();

  const isConnected = !!activeAccount?.address;

  useEffect(() => {
    if (!isConnected) router.replace("/auth");
  }, [isConnected, router]);

  const { data: accountBalance, isLoading: isLoadingBalance } = useAccountBalance({
    address: activeAccount?.address || "",
    client: client!,
    chain: getEnvironmentChain(chainId),
  });

  const { data: userProfiles } = useUserProfiles({ client: client! });

  const { data: socialProfiles } = useSocialAccounts({
    client: client!,
    address: activeAccount?.address || "",
  });

  const emailProfile = userProfiles?.find(
    (p) =>
      p.type === "email" ||
      p.type === "google" ||
      p.type === "discord" ||
      p.type === "apple" ||
      p.type === "facebook"
  );
  const phoneProfile = userProfiles?.find((p) => p.type === "phone");

  const userEmail = (emailProfile as any)?.details?.email;
  const userPhone = (phoneProfile as any)?.details?.phone;

  const handleLogout = () => {
    const first = connectedAccounts?.[0];
    if (first) disconnect(first);
  };

  if (!isConnected) return null;

  return (
    <main className="relative min-h-screen">
      <AnimatedBackground />

      <div className="mx-auto min-h-screen w-full max-w-md px-5 py-10">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xl font-semibold">Account</div>
            <div className="text-sm text-[var(--re-muted)]">
              {getEnvironmentChain(chainId)?.name ?? "Network"}
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="rounded-full border border-[var(--re-border)] bg-white/60 px-4 py-2 text-sm font-semibold"
          >
            Logout
          </button>
        </div>

        <div className="mt-6 space-y-4">
          <div className="rounded-3xl border border-[var(--re-border)] bg-[var(--re-card)] p-5">
            <div className="text-xs text-[var(--re-muted)]">Wallet address</div>
            <div className="mt-1 break-all text-sm font-semibold">{activeAccount.address}</div>
          </div>

          <div className="rounded-3xl border border-[var(--re-border)] bg-[var(--re-card)] p-5">
            <div className="text-xs text-[var(--re-muted)]">Balance</div>
            <div className="mt-1 text-sm font-semibold">
              {isLoadingBalance ? "Loading…" : (accountBalance as any)?.displayValue ?? "—"}{" "}
              {(accountBalance as any)?.symbol ?? ""}
            </div>
          </div>

          <div className="rounded-3xl border border-[var(--re-border)] bg-[var(--re-card)] p-5">
            <div className="text-xs text-[var(--re-muted)]">Contact</div>
            <div className="mt-2 space-y-1 text-sm">
              <div><span className="text-[var(--re-muted)]">Email:</span> {userEmail ?? "—"}</div>
              <div><span className="text-[var(--re-muted)]">Phone:</span> {userPhone ?? "—"}</div>
            </div>
          </div>

          <div className="rounded-3xl border border-[var(--re-border)] bg-[var(--re-card)] p-5">
            <div className="text-xs text-[var(--re-muted)]">Social</div>
            <pre className="mt-2 max-h-40 overflow-auto rounded-2xl bg-black/5 p-3 text-xs">
              {JSON.stringify(socialProfiles ?? [], null, 2)}
            </pre>
          </div>
        </div>
      </div>
    </main>
  );
}
