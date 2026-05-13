import Link from "next/link";
import { WifiOff } from "lucide-react";

export const dynamic = "force-static";

export const metadata = {
  title: "You're offline",
};

export default function OfflinePage() {
  return (
    <div className="min-h-[calc(100vh-4rem)] grid place-items-center px-4 text-center">
      <div className="max-w-md">
        <WifiOff className="mx-auto size-12 text-[var(--color-muted)] mb-4" />
        <h1 className="text-2xl font-bold tracking-tight">You&apos;re offline</h1>
        <p className="mt-2 text-[var(--color-muted)]">
          We can&apos;t reach the network right now. Pages you&apos;ve visited
          before may still load. Streaming requires a live connection.
        </p>
        <Link
          href="/"
          className="inline-block mt-5 px-5 py-2.5 rounded-lg bg-white/10 hover:bg-white/15"
        >
          Try home again
        </Link>
      </div>
    </div>
  );
}
