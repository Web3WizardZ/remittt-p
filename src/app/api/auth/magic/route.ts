// src/app/api/auth/magic/route.ts
import { NextResponse } from "next/server";
import { Magic } from "@magic-sdk/admin";

const magicAdmin = new Magic(process.env.MAGIC_SECRET_KEY!);

export async function POST(req: Request) {
  const { didToken } = await req.json();

  if (!didToken) {
    return NextResponse.json({ error: "Missing didToken" }, { status: 400 });
  }

  try {
    await magicAdmin.token.validate(didToken);
    const issuer = await magicAdmin.token.getIssuer(didToken);

    // TODO: set a secure session cookie here (JWT or iron-session, etc.)
    // For now return issuer so you can confirm it works end-to-end.
    return NextResponse.json({ ok: true, issuer });
  } catch (e) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }
}
