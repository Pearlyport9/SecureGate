import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { LogoutButton } from "@/components/LogoutButton";
import Link from "next/link";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/");
  }

  const initial = (session.user.name ?? session.user.email ?? "U").charAt(0).toUpperCase();

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <nav className="flex items-center justify-between border-b bg-white px-8 py-4">
        <span className="text-lg font-bold text-gray-900">SecureGate</span>
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-900 text-sm font-semibold text-white">
            {initial}
          </div>
          <span className="text-sm font-medium text-gray-700">{session.user.name ?? "User"}</span>
        </div>
      </nav>

      <div className="flex flex-1 items-center justify-center p-8">
        <div className="max-w-xl w-full rounded-2xl bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome back, {session.user.name ?? "User"}
          </h1>
          <p className="mt-1 text-gray-500">{session.user.email}</p>

          <span className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            Verified
          </span>

          <div className="mt-8 flex items-center gap-3">
            <Link
              href="/settings"
              className="rounded-lg bg-green-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-green-700"
            >
              Go to Settings
            </Link>
            <LogoutButton className="rounded-lg border border-green-600 bg-white px-6 py-2.5 text-sm font-semibold text-green-600 transition hover:bg-green-50" />
          </div>
        </div>
      </div>
    </div>
  );
}
