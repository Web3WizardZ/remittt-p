// src/lib/magic.ts
import { Magic } from "magic-sdk";
import { EVMExtension } from "@magic-ext/evm";
import { SolanaExtension } from "@magic-ext/solana";

type MagicWithExtensions = ReturnType<typeof createMagic>;

let magicSingleton: MagicWithExtensions | null = null;

function createMagic(publishableKey: string) {
  return new Magic(publishableKey, {
    extensions: [
      new EVMExtension([
        { chainId: 1, rpcUrl: "https://rpc.ankr.com/eth", default: true },
        { chainId: 137, rpcUrl: "https://polygon-rpc.com" },
        { chainId: 10, rpcUrl: "https://mainnet.optimism.io" },
        { chainId: 8453, rpcUrl: "https://mainnet.base.org" },
        { chainId: 42161, rpcUrl: "https://arb1.arbitrum.io/rpc" },
      ]),
      new SolanaExtension({
        rpcUrl:
          process.env.NEXT_PUBLIC_SOLANA_RPC_URL ??
          "https://api.mainnet-beta.solana.com",
      }),
    ],
  });
}

export function getMagic(): MagicWithExtensions {
  if (typeof window === "undefined") {
    throw new Error("Magic must be initialized in the browser");
  }

  if (magicSingleton) return magicSingleton;

  const publishableKey = process.env.NEXT_PUBLIC_MAGIC_PUBLISHABLE_KEY;
  if (!publishableKey) {
    throw new Error("Missing NEXT_PUBLIC_MAGIC_PUBLISHABLE_KEY");
  }

  magicSingleton = createMagic(publishableKey);
  return magicSingleton;
}