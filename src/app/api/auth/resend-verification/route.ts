export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextResponse } from "next/server";
import crypto from "crypto";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { sendVerificationEmail } from "@/lib/mail";
import { resendVerificationLimiter } from "@/lib/rate-limit";

export async function POST(req: Request) {
  try {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      req.headers.get("x-real-ip") ??
      "unknown";

    const { success } = await resendVerificationLimiter.limit(ip);

    if (!success) {
      return NextResponse.json(
        { error: "Too many attempts. Please try again later." },
        { status: 429 }
      );
    }

    const body = await req.json();
    const emailSchema = z.string().email();
    const parsed = emailSchema.safeParse(body.email);

    if (!parsed.success) {
      return NextResponse.json({ error: "Email is required." }, { status: 400 });
    }

    const email = parsed.data;
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || user.emailVerified) {
      return NextResponse.json(
        { message: "If the account exists and is unverified, a verification email has been sent." },
        { status: 200 }
      );
    }

    await prisma.verificationToken.deleteMany({
      where: { identifier: email },
    });

    const token = crypto.randomBytes(32).toString("hex");

    await prisma.verificationToken.create({
      data: {
        identifier: email,
        token,
        expires: new Date(Date.now() + 15 * 60 * 1000),
        userId: user.id,
      },
    });

    await sendVerificationEmail(email, token);

    return NextResponse.json(
      { message: "If the account exists and is unverified, a verification email has been sent." },
      { status: 200 }
    );
  } catch {
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
