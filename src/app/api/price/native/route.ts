// src/app/api/price/native/route.ts
import { NextResponse } from "next/server";

const COINGECKO_IDS: Record<number, string> = {
  1: "ethereum",
  10: "ethereum",
  137: "matic-network",
  8453: "ethereum",
  42220: "celo",
  42161: "ethereum",
};

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const chainId = Number(searchParams.get("chainId") || "1");

    const id = COINGECKO_IDS[chainId];
    if (!id) {
      return NextResponse.json({ error: "Unsupported chain" }, { status: 400 });
    }

    const r = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(
        id
      )}&vs_currencies=usd`,
      {
        cache: "no-store",
        headers: { accept: "application/json" },
      }
    );

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