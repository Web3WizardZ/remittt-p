// src/lib/magic.ts
import { Magic } from "magic-sdk";
import { EVMExtension } from "@magic-ext/evm";
import { SolanaExtension } from "@magic-ext/solana";

function env(key: string) {
  const v = process.env[key];
  return v && v.trim().length ? v.trim() : "";
}

const RPC = {
  ETHEREUM: env("NEXT_PUBLIC_RPC_ETHEREUM") || "https://cloudflare-eth.com",
  POLYGON:
    env("NEXT_PUBLIC_RPC_POLYGON") || "https://polygon-bor-rpc.publicnode.com",
  OPTIMISM:
    env("NEXT_PUBLIC_RPC_OPTIMISM") || "https://optimism-rpc.publicnode.com",
  BASE: env("NEXT_PUBLIC_RPC_BASE") || "https://base-rpc.publicnode.com",
  ARBITRUM:
    env("NEXT_PUBLIC_RPC_ARBITRUM") || "https://arbitrum-one-rpc.publicnode.com",
  SOLANA:
    env("NEXT_PUBLIC_SOLANA_RPC_URL") || "https://api.mainnet-beta.solana.com",
};

const magicInstance =
  typeof window !== "undefined"
    ? new Magic(process.env.NEXT_PUBLIC_MAGIC_PUBLISHABLE_KEY || "", {
        extensions: [
          new EVMExtension([
            { chainId: 1, rpcUrl: RPC.ETHEREUM, default: true },
            { chainId: 137, rpcUrl: RPC.POLYGON },
            { chainId: 10, rpcUrl: RPC.OPTIMISM },
            { chainId: 8453, rpcUrl: RPC.BASE },
            { chainId: 42161, rpcUrl: RPC.ARBITRUM },
          ]),
          new SolanaExtension({ rpcUrl: RPC.SOLANA }),
        ],
      })
    : null;

export function getMagic() {
  if (typeof window === "undefined") {
    throw new Error("Magic must be initialized in the browser");
  }

  if (!process.env.NEXT_PUBLIC_MAGIC_PUBLISHABLE_KEY) {
    throw new Error("Missing NEXT_PUBLIC_MAGIC_PUBLISHABLE_KEY");
  }

  if (!magicInstance) {
    throw new Error("Magic failed to initialize");
  }

  return magicInstance;
}

export const CHAIN_RPC = RPC;
export default getMagic;