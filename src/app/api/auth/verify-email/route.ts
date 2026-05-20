export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(req: Request) {
  try {
    console.log('=== VERIFY EMAIL ROUTE HIT ===');

    const { token } = await req.json();
    console.log('Token:', token);

    if (!token || typeof token !== "string") {
      return NextResponse.json({ error: "Missing token" }, { status: 400 });
    }

    const verification = await prisma.verificationToken.findUnique({
      where: { token },
    });
    console.log('Token found:', verification ? 'YES' : 'NO');
    console.log('Token expires:', verification?.expires);
    console.log('Now:', new Date());

    if (!verification) {
      return NextResponse.json(
        { error: "invalid", message: "Invalid verification link." },
        { status: 400 }
      );
    }

    if (verification.expires < new Date()) {
      await prisma.verificationToken.delete({ where: { token } });
      return NextResponse.json(
        { error: "expired", message: "This verification link has expired." },
        { status: 400 }
      );
    }

    await prisma.user.update({
      where: { email: verification.identifier },
      data: { emailVerified: new Date() },
    });

    await prisma.verificationToken.delete({ where: { token } });

    return NextResponse.json(
      { message: "Email verified successfully. You can now log in." },
      { status: 200 }
    );
  } catch (error) {
    console.error('=== VERIFY EMAIL ERROR ===')
    console.error(error)
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
