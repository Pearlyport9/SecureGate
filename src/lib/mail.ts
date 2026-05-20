import nodemailer from "nodemailer";
import { renderAsync } from "@react-email/render";
import { VerificationEmail } from "../../emails/verification-email";
import { ResetPasswordEmail } from "../../emails/reset-password-email";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

export async function sendVerificationEmail(email: string, token: string) {
  const verificationUrl = `${process.env.NEXTAUTH_URL}/verify-email/${token}`;

  const html = await renderAsync(
    VerificationEmail({ url: verificationUrl }),
    { pretty: true }
  );

  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: email,
      subject: "Verify your email address",
      html,
    });
    return info;
  } catch (err) {
    console.error("[mail.ts] Failed to send email:", err);
    throw err;
  }
}

export async function sendPasswordResetEmail(email: string, token: string) {
  const resetUrl = `${process.env.NEXTAUTH_URL}/reset-password/${token}`;

  const html = await renderAsync(
    ResetPasswordEmail({ url: resetUrl }),
    { pretty: true }
  );

  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: email,
      subject: "Reset your password",
      html,
    });
    return info;
  } catch (err) {
    console.error("[mail.ts] Failed to send email:", err);
    throw err;
  }
}
