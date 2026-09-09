import type { Metadata } from "next";
import Link from "next/link";
import { Bookmark, History, Scale, LogIn } from "lucide-react";
import { auth } from "@/auth";
import LanguagePicker from "@/components/LanguagePicker";
import SignOutButton from "@/components/SignOutButton";
import { WATCH_REGION } from "@/lib/providers";

export const metadata: Metadata = {
  title: "Settings",
  description: "Display language, account, and your saved activity.",
};

// Reads the session, so there is nothing to prerender.
export const dynamic = "force-dynamic";

function Row({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-4">
      <div className="min-w-0">
        <div className="text-sm font-medium">{label}</div>
        {hint && (
          <div className="text-[0.8125rem] text-[var(--color-muted)] mt-0.5">
            {hint}
          </div>
        )}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-[var(--radius-sheet)] border border-white/[0.08] bg-white/[0.03] divide-y divide-white/[0.06] overflow-hidden">
      {children}
    </div>
  );
}

export default async function SettingsPage() {
  const session = await auth();
  const user = session?.user;

  return (
    <div className="px-4 sm:px-6 lg:px-10 py-8">
      <div className="mx-auto max-w-3xl">
        <header className="mb-7">
          <h1 className="page-title">Settings</h1>
          <p className="text-[var(--color-muted)] mt-1 text-sm">
            Preferences are stored on this device unless you are signed in.
          </p>
        </header>

        <h2 className="section-title mb-3">Playback &amp; display</h2>
        <Panel>
          <Row
            label="Display language"
            hint="Applies to titles, overviews and artwork from TMDB."
          >
            <LanguagePicker />
          </Row>
          <Row
            label="Streaming region"
            hint="Which catalogue the provider tiles filter against."
          >
            <span className="text-sm text-[var(--color-muted)] tabular-nums">
              {WATCH_REGION}
            </span>
          </Row>
        </Panel>

        <h2 className="section-title mt-9 mb-3">Account</h2>
        <Panel>
          {user ? (
            <>
              <Row label="Signed in as" hint={user.email ?? undefined}>
                <span className="text-sm">{user.name ?? "Account"}</span>
              </Row>
              <Row label="Sign out" hint="Ends this session on this device.">
                <SignOutButton />
              </Row>
            </>
          ) : (
            <Row
              label="Not signed in"
              hint="Sign in to sync My List, history and resume points."
            >
              <Link href="/sign-in?callbackUrl=/settings" className="btn-glass">
                <LogIn className="size-4" />
                Sign in
              </Link>
            </Row>
          )}
        </Panel>

        <h2 className="section-title mt-9 mb-3">Your activity</h2>
        <Panel>
          <Row label="My List" hint="Titles you have saved to watch later.">
            <Link href="/favorites" className="btn-glass">
              <Bookmark className="size-4" />
              Open
            </Link>
          </Row>
          <Row label="Watch history" hint="Where you left off, per title.">
            <Link href="/history" className="btn-glass">
              <History className="size-4" />
              Open
            </Link>
          </Row>
        </Panel>

        <h2 className="section-title mt-9 mb-3">About</h2>
        <Panel>
          <Row
            label="Disclaimer &amp; legal"
            hint="How Streamly sources metadata and streams."
          >
            <Link href="/legal" className="btn-glass">
              <Scale className="size-4" />
              Read
            </Link>
          </Row>
          <Row label="Metadata" hint="Titles, artwork and ratings come from TMDB.">
            <span className="text-sm text-[var(--color-muted)]">TMDB</span>
          </Row>
        </Panel>
      </div>
    </div>
  );
}
