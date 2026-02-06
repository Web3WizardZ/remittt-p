import { NextResponse } from "next/server";
import { Magic } from "@magic-sdk/admin";

const magicAdmin = new Magic(process.env.MAGIC_SECRET_KEY!);

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const { idToken } = await req.json();

  if (!idToken) {
    return NextResponse.json({ error: "Missing idToken" }, { status: 400 });
  }

  try {
    // ✅ validate the ID token
    magicAdmin.token.validate(idToken);

    const issuer = magicAdmin.token.getIssuer(idToken);

    return NextResponse.json({ ok: true, issuer });
  } catch {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }
}
