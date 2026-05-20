export const dynamic = 'force-dynamic'

import { prisma } from "@/lib/db"
import Link from "next/link"
import ResendForm from "./resend-form"

interface Props {
  params: { token: string }
}

function SuccessPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md rounded-lg bg-white p-8 text-center shadow-md">
        <meta httpEquiv="refresh" content="3;url=/login" />
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary-container">
          <svg className="h-7 w-7 text-on-primary-container" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="mb-2 text-xl font-bold text-on-surface">Email verified</h1>
        <p className="mb-4 text-on-surface-variant">Your email has been verified successfully. You can now sign in.</p>
        <p className="mb-6 text-sm text-on-surface-variant">Redirecting to sign in in 3 seconds...</p>
        <Link
          href="/login"
          className="inline-block rounded-md bg-primary px-6 py-2.5 text-sm font-semibold text-on-primary hover:brightness-90"
        >
          Sign in now
        </Link>
      </div>
    </div>
  )
}

function InvalidPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md rounded-lg bg-white p-8 text-center shadow-md">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-error-container">
          <svg className="h-7 w-7 text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <h1 className="mb-2 text-xl font-bold text-on-surface">Invalid link</h1>
        <p className="mb-6 text-on-surface-variant">
          This verification link is invalid or has already been used.
        </p>
        <ResendForm />
      </div>
    </div>
  )
}

function ExpiredPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md rounded-lg bg-white p-8 text-center shadow-md">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-tertiary">
          <svg className="h-7 w-7 text-on-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h1 className="mb-2 text-xl font-bold text-on-surface">Link expired</h1>
        <p className="mb-6 text-on-surface-variant">
          This verification link has expired. Enter your email below to receive a new one.
        </p>
        <ResendForm />
      </div>
    </div>
  )
}

function ErrorPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md rounded-lg bg-white p-8 text-center shadow-md">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-error-container">
          <svg className="h-7 w-7 text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <h1 className="mb-2 text-xl font-bold text-on-surface">Something went wrong</h1>
        <p className="mb-6 text-on-surface-variant">Something went wrong. Please try again.</p>
        <Link
          href="/login"
          className="inline-block rounded-md bg-primary px-6 py-2.5 text-sm font-semibold text-on-primary hover:brightness-90"
        >
          Back to sign in
        </Link>
      </div>
    </div>
  )
}

export default async function VerifyEmailPage({ params }: Props) {
  const { token } = params

  if (!token || typeof token !== "string") {
    return <InvalidPage />
  }

  try {
    const verification = await prisma.verificationToken.findUnique({
      where: { token },
    })

    if (!verification) {
      return <InvalidPage />
    }

    if (verification.expires < new Date()) {
      await prisma.verificationToken.delete({ where: { token } })
      return <ExpiredPage />
    }

    await prisma.user.update({
      where: { email: verification.identifier },
      data: { emailVerified: new Date() },
    })

    await prisma.verificationToken.delete({ where: { token } })

    return <SuccessPage />
  } catch (error) {
    console.error("Verify email error:", error)
    return <ErrorPage />
  }
}
