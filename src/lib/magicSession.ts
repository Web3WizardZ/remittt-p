// src/lib/magicSession.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
import { ethers } from "ethers";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function looksLikeEvmAddress(addr: unknown): addr is string {
  return typeof addr === "string" && addr.startsWith("0x") && addr.length >= 42;
}

export async function switchEvmChainSafe(magic: any, chainId: number) {
  try {
    await magic?.evm?.switchChain?.(chainId);
    return;
  } catch {}

  try {
    await magic?.rpcProvider?.request?.({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: `0x${chainId.toString(16)}` }],
    });
  } catch {}
}

export async function getEvmAddressSafe(
  magic: any,
  opts?: { tries?: number; delayMs?: number }
): Promise<string> {
  const tries = opts?.tries ?? 18;
  const delayMs = opts?.delayMs ?? 250;

  for (let i = 0; i < tries; i++) {
    try {
      const provider = new ethers.BrowserProvider(magic.rpcProvider);
      await provider.send("eth_requestAccounts", []);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      if (looksLikeEvmAddress(address)) return address;
    } catch {}

    try {
      const info = await magic?.user?.getInfo?.();
      const address =
        info?.wallets?.ethereum?.publicAddress ??
        info?.wallets?.eth?.publicAddress ??
        info?.publicAddress ??
        info?.public_address;

      if (looksLikeEvmAddress(address)) return address;
    } catch {}

    try {
      const res = await magic?.rpcProvider?.request?.({
        method: "eth_accounts",
      });
      const address = Array.isArray(res) ? res[0] : "";
      if (looksLikeEvmAddress(address)) return address;
    } catch {}

    await sleep(delayMs);
  }

  return "";
}

export async function waitForEvmAddress(magic: any) {
  return getEvmAddressSafe(magic);
}