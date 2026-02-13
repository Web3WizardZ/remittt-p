import type { Magic } from "magic-sdk";

type WaitOpts = {
  timeoutMs?: number;
  intervalMs?: number;
};

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Tries to reliably obtain the user's EVM address.
 * - First reads magic.user.getInfo().publicAddress
 * - If missing, triggers EVM provider initialization (eth_requestAccounts)
 * - Then polls until timeout
 */
export async function waitForEvmAddress(
  magic: Magic,
  opts: WaitOpts = {},
): Promise<string> {
  const timeoutMs = opts.timeoutMs ?? 12_000;
  const intervalMs = opts.intervalMs ?? 500;

  const started = Date.now();

  const tryGet = async () => {
    const info = await magic.user.getInfo();
    const addr = (info as any)?.publicAddress as string | undefined;
    return addr?.startsWith("0x") ? addr : "";
  };

  // 1) quick attempt
  const first = await tryGet();
  if (first) return first;

  // 2) "touch" the EVM provider to force provisioning (safe to call even if already provisioned)
  try {
    await (magic as any).rpcProvider.request?.({ method: "eth_requestAccounts" });
  } catch {
    // ignore - we’ll still poll getInfo()
  }

  // 3) poll
  while (Date.now() - started < timeoutMs) {
    const addr = await tryGet();
    if (addr) return addr;
    await sleep(intervalMs);
  }

  return "";
}
