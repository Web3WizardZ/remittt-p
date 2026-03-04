import type { Magic } from "magic-sdk";

type WaitOpts = {
  timeoutMs?: number;
  intervalMs?: number;
};

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function waitForEvmAddress(
  magic: Magic,
  opts: WaitOpts = {}
): Promise<string> {
  const timeoutMs = opts.timeoutMs ?? 12_000;
  const intervalMs = opts.intervalMs ?? 500;

  const started = Date.now();

  const tryGet = async () => {
    const info = await magic.user.getInfo();
    const addr = (info as any)?.publicAddress as string | undefined;
    return addr?.startsWith("0x") ? addr : "";
  };

  const first = await tryGet();
  if (first) return first;

  try {
    await (magic as any).rpcProvider.request?.({ method: "eth_requestAccounts" });
  } catch {}

  while (Date.now() - started < timeoutMs) {
    const addr = await tryGet();
    if (addr) return addr;
    await sleep(intervalMs);
  }

  return "";
}