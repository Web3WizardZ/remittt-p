// src/app/api/price/native/route.ts
import { NextResponse } from "next/server";

// Native token -> CoinGecko id
const COINGECKO_IDS: Record<number, string> = {
  1: "ethereum", // ETH
  10: "ethereum", // OP native is ETH
  8453: "ethereum", // Base native is ETH
  42161: "ethereum", // Arbitrum native is ETH
  137: "polygon-pos", // MATIC
};

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const chainId = Number(searchParams.get("chainId") || "1");

    const id = COINGECKO_IDS[chainId];
    if (!id) {
      return NextResponse.json({ error: "Unsupported chain" }, { status: 400 });
    }

    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(
      id
    )}&vs_currencies=usd`;

    const r = await fetch(url, {
      cache: "no-store",
      headers: { accept: "application/json" },
    });

    const j = await r.json().catch(() => ({}));
    const usd = Number(j?.[id]?.usd ?? 0);

    if (!r.ok || !usd) {
      return NextResponse.json({ error: "Price unavailable" }, { status: 502 });
    }

    return NextResponse.json({ usd, chainId });
  } catch {
    return NextResponse.json({ error: "Price unavailable" }, { status: 500 });
  }
}