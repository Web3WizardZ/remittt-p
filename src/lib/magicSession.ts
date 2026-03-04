import type { Magic } from "magic-sdk";

type WaitOpts = {
  timeoutMs?: number;
  intervalMs?: number;
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function withTimeout<T>(p: Promise<T>, ms: number, fallback: T): Promise<T> {
  let t: any;
  return Promise.race([
    p.finally(() => clearTimeout(t)),
    new Promise<T>((resolve) => (t = setTimeout(() => resolve(fallback), ms))),
  ]);
}

/**
 * Reliable EVM address fetch:
 * 1) rpcProvider.eth_accounts
 * 2) user.getInfo().publicAddress (guarded with timeout)
 * 3) rpcProvider.eth_requestAccounts
 * 4) repeat until timeout
 */
export async function waitForEvmAddress(
  magic: Magic,
  opts: WaitOpts = {}
): Promise<string> {
  const timeoutMs = opts.timeoutMs ?? 20_000;
  const intervalMs = opts.intervalMs ?? 400;

  const started = Date.now();

  const getFromRpc = async (): Promise<string> => {
    const provider = (magic as any)?.rpcProvider;
    if (!provider?.request) return "";

    // Try eth_accounts first (no UI / no permission prompt)
    const accts = await withTimeout<string[]>(
      provider.request({ method: "eth_accounts" }),
      1500,
      []
    );

    const a0 = accts?.[0];
    return typeof a0 === "string" && a0.startsWith("0x") ? a0 : "";
  };

  const getFromInfo = async (): Promise<string> => {
    // Guard getInfo because it sometimes hangs
    const info = await withTimeout<any>(
      (magic as any).user.getInfo(),
      2000,
      null
    );
    const addr = info?.publicAddress as string | undefined;
    return typeof addr === "string" && addr.startsWith("0x") ? addr : "";
  };

  // Small initial delay helps avoid “stuck on getInfo” right after redirect/login
  await sleep(250);

  while (Date.now() - started < timeoutMs) {
    // 1) provider accounts
    const a1 = await getFromRpc();
    if (a1) return a1;

    // 2) user.getInfo
    const a2 = await getFromInfo();
    if (a2) return a2;

    // 3) force provisioning (may show wallet permission internally)
    try {
      const provider = (magic as any)?.rpcProvider;
      const req = provider?.request;
      if (req) {
        const accts = await withTimeout<string[]>(
          req({ method: "eth_requestAccounts" }),
          2500,
          []
        );
        const a0 = accts?.[0];
        if (typeof a0 === "string" && a0.startsWith("0x")) return a0;
      }
    } catch {
      // ignore and keep polling
    }

    await sleep(intervalMs);
  }

  return "";
}