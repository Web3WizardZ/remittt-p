// src/lib/chainrails.ts
import { NextResponse } from "next/server";

export type ChainrailsChain =
  | "ETHEREUM_MAINNET"
  | "ARBITRUM_MAINNET"
  | "AVALANCHE_MAINNET"
  | "BASE_MAINNET"
  | "OPTIMISM_MAINNET"
  | "POLYGON_MAINNET"
  | "BSC_MAINNET";

export const CHAINRAILS_SOURCE_BY_NETWORK: Record<string, ChainrailsChain | null> =
  {
    eth: "ETHEREUM_MAINNET",
    base: "BASE_MAINNET",
    op: "OPTIMISM_MAINNET",
    avax: "AVALANCHE_MAINNET",
    arb: "ARBITRUM_MAINNET",
    celo: null,
    sol: null,
  };

export const CHAINRAILS_DESTINATIONS: { value: ChainrailsChain; label: string }[] =
  [
    { value: "ETHEREUM_MAINNET", label: "Ethereum" },
    { value: "BASE_MAINNET", label: "Base" },
    { value: "OPTIMISM_MAINNET", label: "Optimism" },
    { value: "ARBITRUM_MAINNET", label: "Arbitrum" },
    { value: "AVALANCHE_MAINNET", label: "Avalanche" },
    { value: "POLYGON_MAINNET", label: "Polygon" },
    { value: "BSC_MAINNET", label: "BNB Chain" },
  ];

export function chainrailsHeaders(extra?: HeadersInit): HeadersInit {
  const apiKey = process.env.CHAINRAILS_API_KEY;

  if (!apiKey) {
    throw new Error("Missing CHAINRAILS_API_KEY");
  }

  return {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
    ...(extra ?? {}),
  };
}

export async function chainrailsFetch<T>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const res = await fetch(`https://api.chainrails.io/api/v1${path}`, {
    ...init,
    headers: chainrailsHeaders(init?.headers),
    cache: "no-store",
  });

  const text = await res.text();
  let json: any = null;

  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = text;
  }

  if (!res.ok) {
    const msg =
      json?.message ||
      json?.error ||
      (typeof json === "string" ? json : "") ||
      `Chainrails request failed with ${res.status}`;
    throw new Error(msg);
  }

  return json as T;
}

export async function getChainTokenBySymbol(
  chain: ChainrailsChain,
  symbol: string
) {
  const tokens = await chainrailsFetch<
    Array<{
      address: string;
      symbol: string;
      decimals: number;
      name: string;
    }>
  >(`/chains/${chain}/tokens`);

  const found = tokens.find(
    (t) => t.symbol.toUpperCase() === symbol.toUpperCase()
  );

  if (!found) {
    throw new Error(`${symbol} is not supported on ${chain}`);
  }

  return found;
}

export function apiError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}