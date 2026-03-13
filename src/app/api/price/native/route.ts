// src/app/api/price/native/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const COINGECKO_IDS: Record<number, string> = {
  1: "ethereum",
  10: "ethereum",
  8453: "ethereum",
  43114: "avalanche-2",
  42220: "celo",
  42161: "ethereum",
  999: "solana",
};

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const chainId = Number(searchParams.get("chainId") || "1");

    const id = COINGECKO_IDS[chainId];
    if (!id) {
      return NextResponse.json({ error: "Unsupported chain" }, { status: 400 });
    }

    const url =
      id === "solana"
        ? "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd"
        : `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(
            id
          )}&vs_currencies=usd`;

    const res = await fetch(url, {
      cache: "no-store",
      headers: { accept: "application/json" },
    });

    const json = await res.json().catch(() => ({}));
    const usd = Number(json?.[id]?.usd ?? 0);

    if (!res.ok || !usd) {
      return NextResponse.json({ error: "Price unavailable" }, { status: 502 });
    }

    return NextResponse.json({ usd, chainId });
  } catch {
    return NextResponse.json({ error: "Price unavailable" }, { status: 500 });
  }
}