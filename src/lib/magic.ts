import { Magic } from "magic-sdk";
import { EVMExtension } from "@magic-ext/evm";

let magic: Magic<EVMExtension[]> | null = null;

export function getMagic() {
  if (typeof window === "undefined") return null;

  if (!magic) {
    const key = process.env.NEXT_PUBLIC_MAGIC_PUBLISHABLE_KEY;
    if (!key) throw new Error("Missing NEXT_PUBLIC_MAGIC_PUBLISHABLE_KEY");

    const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL;
    const chainIdStr = process.env.NEXT_PUBLIC_CHAIN_ID;

    if (!rpcUrl) throw new Error("Missing NEXT_PUBLIC_RPC_URL");
    if (!chainIdStr) throw new Error("Missing NEXT_PUBLIC_CHAIN_ID");

    const chainId = Number(chainIdStr);

    magic = new Magic(key, {
      extensions: [
        // ✅ IMPORTANT: array passed directly (NOT { network: [...] })
        new EVMExtension([
          {
            rpcUrl,
            chainId,
          },
        ]),
      ],
    });
  }

  return magic;
}
