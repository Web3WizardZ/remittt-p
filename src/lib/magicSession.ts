// src/lib/magicSession.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
import { ethers } from "ethers";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function looksLikeEvmAddress(addr: unknown): addr is string {
  return typeof addr === "string" && addr.startsWith("0x") && addr.length >= 42;
}

async function tryFromUserInfoEvm(magic: any): Promise<string> {
  try {
    const info = await magic?.user?.getInfo?.();
    const a =
      info?.wallets?.ethereum?.publicAddress ??
      info?.wallets?.eth?.publicAddress ??
      info?.wallets?.[0]?.publicAddress ??
      info?.publicAddress ??
      info?.public_address;
    return looksLikeEvmAddress(a) ? a : "";
  } catch {
    return "";
  }
}

async function tryFromEthers(magic: any): Promise<string> {
  try {
    const provider = new ethers.BrowserProvider(magic.rpcProvider);
    const accounts = await provider.listAccounts();
    const a = accounts?.[0]?.address;
    return looksLikeEvmAddress(a) ? a : "";
  } catch {
    return "";
  }
}

async function tryFromRpc(magic: any): Promise<string> {
  try {
    const res = await magic?.rpcProvider?.request?.({ method: "eth_accounts" });
    const a = Array.isArray(res) ? res[0] : "";
    return looksLikeEvmAddress(a) ? a : "";
  } catch {
    return "";
  }
}

async function forceProvisioningEvm(magic: any) {
  try {
    await magic?.rpcProvider?.request?.({ method: "eth_requestAccounts" });
  } catch {}
}

export async function switchEvmChainSafe(magic: any, chainId: number) {
  try {
    await magic?.evm?.switchChain?.(chainId);
  } catch {
    await magic?.rpcProvider?.request?.({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: `0x${chainId.toString(16)}` }],
    });
  }
}

export async function getEvmAddressSafe(
  magic: any,
  opts?: { tries?: number; delayMs?: number }
): Promise<string> {
  const tries = opts?.tries ?? 18;
  const delayMs = opts?.delayMs ?? 250;

  for (let i = 0; i < tries; i++) {
    const a1 = await tryFromUserInfoEvm(magic);
    if (a1) return a1;

    const a2 = await tryFromEthers(magic);
    if (a2) return a2;

    const a3 = await tryFromRpc(magic);
    if (a3) return a3;

    if (i === Math.floor(tries / 2)) {
      await forceProvisioningEvm(magic);
    }

    await sleep(delayMs);
  }

  return "";
}

export async function getSolanaAddressSafe(
  magic: any,
  opts?: { tries?: number; delayMs?: number }
): Promise<string> {
  const tries = opts?.tries ?? 18;
  const delayMs = opts?.delayMs ?? 250;

  for (let i = 0; i < tries; i++) {
    try {
      const addr = await magic?.solana?.getPublicAddress?.();
      if (typeof addr === "string" && addr.length > 20) return addr;
    } catch {}
    await sleep(delayMs);
  }

  return "";
}

export async function waitForEvmAddress(magic: any) {
  return getEvmAddressSafe(magic);
}