import { Magic } from "magic-sdk";
import { EVMExtension } from "@magic-ext/evm";
import { SolanaExtension } from "@magic-ext/solana";

const MAGIC_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_MAGIC_PUBLISHABLE_KEY || "";

const SOLANA_RPC_URL =
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com";

function createMagicInstance() {
  if (!MAGIC_PUBLISHABLE_KEY) {
    throw new Error("Missing NEXT_PUBLIC_MAGIC_PUBLISHABLE_KEY");
  }

  return new Magic(MAGIC_PUBLISHABLE_KEY, {
    extensions: [
      new EVMExtension([
        {
          rpcUrl: "https://mainnet.base.org",
          chainId: 8453,
        },
        {
          rpcUrl: "https://mainnet.optimism.io",
          chainId: 10,
        },
        {
          rpcUrl: "https://api.avax.network/ext/bc/C/rpc",
          chainId: 43114,
        },
        {
          rpcUrl: "https://forno.celo.org",
          chainId: 42220,
        },
        {
          rpcUrl: "https://arb1.arbitrum.io/rpc",
          chainId: 42161,
        },
      ]),
      new SolanaExtension({
        rpcUrl: SOLANA_RPC_URL,
      }),
    ],
  });
}

type MagicInstance = ReturnType<typeof createMagicInstance>;

declare global {
  interface Window {
    __magicInstance__?: MagicInstance;
  }
}

let magicInstance: MagicInstance | null = null;

export function getMagic(): MagicInstance {
  if (typeof window === "undefined") {
    throw new Error("Magic must be initialized in the browser");
  }

  if (window.__magicInstance__) {
    return window.__magicInstance__;
  }

  if (!magicInstance) {
    magicInstance = createMagicInstance();
  }

  window.__magicInstance__ = magicInstance;
  return magicInstance;
}

export const solanaRpcUrl = SOLANA_RPC_URL;

export default getMagic;