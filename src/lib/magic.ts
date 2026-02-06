// src/lib/magic.ts
import { Magic } from "magic-sdk";

let magic: Magic | null = null;

export function getMagic() {
  if (typeof window === "undefined") return null;

  const key = process.env.NEXT_PUBLIC_MAGIC_API_KEY;
  if (!key) return null;

  if (!magic) {
    magic = new Magic(key, {
      network: {
        rpcUrl: process.env.NEXT_PUBLIC_RPC_URL || "https://rpc.sepolia.org",
        chainId: Number(process.env.NEXT_PUBLIC_CHAIN_ID || 11155111),
      },
    });
  }
  return magic;
}
