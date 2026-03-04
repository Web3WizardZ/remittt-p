import { NextResponse } from "next/server";
import { Magic } from "@magic-sdk/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const magicAdmin = new Magic(process.env.MAGIC_SECRET_KEY!);

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);

  const idToken = body?.idToken as string | undefined;
  const address = body?.address as string | undefined;

  if (!idToken) {
    return NextResponse.json({ error: "Missing idToken" }, { status: 400 });
  }

  if (!address || typeof address !== "string" || !address.startsWith("0x")) {
    return NextResponse.json({ error: "Invalid address" }, { status: 400 });
  }

  try {
    await magicAdmin.token.validate(idToken);
    const issuer = magicAdmin.token.getIssuer(idToken);

    // ✅ Persist issuer -> address in your DB here.
    // Example (Prisma):
    // await prisma.user.upsert({
    //   where: { issuer },
    //   create: { issuer, walletAddress: address },
    //   update: { walletAddress: address },
    // });

    return NextResponse.json({ ok: true, issuer, address });
  } catch {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }
}