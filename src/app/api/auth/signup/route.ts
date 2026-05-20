export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextResponse } from "next/server";
import crypto from "crypto";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { sendVerificationEmail } from "@/lib/mail";
import { hashPassword } from "@/lib/password";

const signupSchema = z
  .object({
    name: z.string().min(1, "Name is required"),
    email: z.string().email("Invalid email address"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Password must contain an uppercase letter")
      .regex(/[a-z]/, "Password must contain a lowercase letter")
      .regex(/[0-9]/, "Password must contain a number"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

const GENERIC_SUCCESS =
  "If this email is valid, a verification link has been sent.";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = signupSchema.safeParse(body);

    if (!parsed.success) {
      const firstError = parsed.error.errors[0]?.message ?? "Validation failed";
      return NextResponse.json({ error: firstError }, { status: 400 });
    }

    const { name, email, password } = parsed.data;
    const hashedPassword = await hashPassword(password);

    let user;
    try {
      user = await prisma.user.create({
        data: { name, email, password: hashedPassword },
      });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2002"
      ) {
        const existing = await prisma.user.findUnique({ where: { email } });

        if (existing && !existing.emailVerified) {
          const token = crypto.randomBytes(32).toString("hex");
          await prisma.verificationToken.deleteMany({
            where: { identifier: email },
          });
          await prisma.verificationToken.create({
            data: {
              identifier: email,
              token,
              expires: new Date(Date.now() + 15 * 60 * 1000),
              userId: existing.id,
            },
          });
          sendVerificationEmail(email, token).catch((e) =>
            console.error("Failed to send verification email:", e)
          );
        }
      } else {
        console.error("Unexpected signup error:", err);
      }

      return NextResponse.json({ message: GENERIC_SUCCESS }, { status: 201 });
    }

    const token = crypto.randomBytes(32).toString("hex");
    await prisma.verificationToken.create({
      data: {
        identifier: email,
        token,
        expires: new Date(Date.now() + 15 * 60 * 1000),
        userId: user.id,
      },
    });
    sendVerificationEmail(email, token).catch((e) =>
      console.error("Failed to send verification email:", e)
    );

    return NextResponse.json({ message: GENERIC_SUCCESS }, { status: 201 });
  } catch (error: unknown) {
    console.error("Unexpected signup route error:", error);
    return NextResponse.json({ message: GENERIC_SUCCESS }, { status: 201 });
  }
}
