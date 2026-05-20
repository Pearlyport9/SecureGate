"use client";

import { useState, useCallback } from "react";
import { signOut } from "next-auth/react";

export function LogoutButton({ className }: { className?: string }) {
  const [loading, setLoading] = useState(false);

  const handleLogout = useCallback(async () => {
    setLoading(true);
    await signOut({ callbackUrl: "/" });
  }, []);

  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      className={className}
    >
      {loading ? "Signing out..." : "Sign out"}
    </button>
  );
}
