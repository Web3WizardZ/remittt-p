import { Magic } from "magic-sdk";
import { EVMExtension } from "@magic-ext/evm";
import { SolanaExtension } from "@magic-ext/solana";

const magicInstance =
  typeof window !== "undefined"
    ? new Magic(process.env.NEXT_PUBLIC_MAGIC_PUBLISHABLE_KEY || "", {
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
            rpcUrl: "https://api.mainnet-beta.solana.com",
          }),
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

export default getMagic;