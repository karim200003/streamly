import Link from "next/link";
import { SearchX } from "lucide-react";

export const metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <div className="min-h-[calc(100vh-4rem)] grid place-items-center px-4 text-center">
      <div className="max-w-md">
        <p className="text-[8rem] font-bold leading-none text-white/[0.06] select-none tabular-nums">
          404
        </p>
        <SearchX className="mx-auto size-12 text-[var(--color-muted)] -mt-6 mb-4" />
        <h1 className="text-2xl font-bold tracking-tight">Page not found</h1>
        <p className="mt-2 text-[var(--color-muted)]">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <Link
          href="/"
          className="inline-block mt-6 px-6 py-3 rounded-full bg-white text-black font-semibold hover:bg-white/90 active:scale-[0.97] transition"
        >
          Back to home
        </Link>
      </div>
    </div>
  );
}
