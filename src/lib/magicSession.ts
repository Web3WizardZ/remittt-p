import type { Magic } from "magic-sdk";

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function waitForEvmAddress(
  magic: Magic<any>,
  opts?: { retries?: number; delayMs?: number }
): Promise<string | null> {
  const retries = opts?.retries ?? 16;
  const delayMs = opts?.delayMs ?? 250;

  for (let i = 0; i < retries; i++) {
    try {
      const isLoggedIn = await magic.user.isLoggedIn();
      if (!isLoggedIn) return null;

      const evmAddr =
        (magic as any).evm?.getPublicAddress
          ? await (magic as any).evm.getPublicAddress()
          : null;

      if (typeof evmAddr === "string" && evmAddr.startsWith("0x")) return evmAddr;

      const info = await magic.user.getInfo();
      const addr = (info as any)?.publicAddress as string | undefined;
      if (addr && addr.startsWith("0x")) return addr;
    } catch {}

    await sleep(delayMs);
  }

  return null;
}
