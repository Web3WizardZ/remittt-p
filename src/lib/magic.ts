// src/lib/magic.ts
import { Magic } from "magic-sdk";
import { EVMExtension } from "@magic-ext/evm";
import { SolanaExtension } from "@magic-ext/solana";

let magic: ReturnType<typeof createMagic> | null = null;

function createMagic() {
  return new Magic(process.env.NEXT_PUBLIC_MAGIC_PUBLISHABLE_KEY!, {
    extensions: [
      new EVMExtension([
        {
          rpcUrl: process.env.NEXT_PUBLIC_EVM_RPC_URL!,
          chainId: Number(process.env.NEXT_PUBLIC_EVM_CHAIN_ID || 1),
          default: true,
        },
      ]),
      new SolanaExtension({
        rpcUrl: process.env.NEXT_PUBLIC_SOLANA_RPC_URL!,
      }),
    ],
  });
}

export function getMagic() {
  if (typeof window === "undefined") return null;

  if (!magic) {
    magic = createMagic();
  }

  return magic;
}