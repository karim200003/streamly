"use client";

import { LogOut } from "lucide-react";
import { signOut } from "next-auth/react";

/**
 * `signOut` is a client-side call, so the otherwise-static Settings page
 * only needs this one leaf to ship JS.
 */
export default function SignOutButton() {
  return (
    <button onClick={() => signOut()} className="btn-glass">
      <LogOut className="size-4" />
      Sign out
    </button>
  );
}
