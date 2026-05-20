import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { ResendButton } from "./resend-button";

export default async function VerifyPromptPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    redirect("/");
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md rounded-lg bg-white p-8 text-center shadow-md">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-tertiary">
          <svg className="h-7 w-7 text-on-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>

        <h1 className="mb-2 text-xl font-bold text-on-surface">Verify your email</h1>
        <p className="mb-1 text-sm text-on-surface-variant">
          You need to verify your email before you can access the dashboard.
        </p>
        <p className="mb-6 text-sm text-outline">
          A verification link was sent to <span className="font-medium text-on-surface">{session.user.email}</span>.
        </p>

        <ResendButton email={session.user.email} />

        <p className="mt-6 text-center text-sm text-outline">
          <a href="/" className="font-semibold text-on-surface hover:underline">
            Back to sign in
          </a>
        </p>
      </div>
    </div>
  );
}
