// src/app/api/price/eth/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const res = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd",
      { cache: "no-store" }
    );

    if (!res.ok) return NextResponse.json({ error: "Price unavailable" }, { status: 502 });

    const data = await res.json();
    const price = data?.ethereum?.usd;

    if (typeof price !== "number")
      return NextResponse.json({ error: "Price unavailable" }, { status: 502 });

    return NextResponse.json({ ok: true, usd: price });
  } catch {
    return NextResponse.json({ error: "Price unavailable" }, { status: 502 });
  }
}