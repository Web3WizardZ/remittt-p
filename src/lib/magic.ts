// src/lib/magic.ts
import { Magic } from "magic-sdk";
import { EVMExtension } from "@magic-ext/evm";

const magicInstance =
  typeof window !== "undefined"
    ? new Magic(process.env.NEXT_PUBLIC_MAGIC_PUBLISHABLE_KEY || "", {
        extensions: [
          new EVMExtension([
            {
              rpcUrl: "https://arb1.arbitrum.io/rpc",
              chainId: 42161,
            },
          ]),
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