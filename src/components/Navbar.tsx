"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Search, User, Menu, X } from "lucide-react";
import { useSession, signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import { useFocusTrap } from "@/lib/use-focus-trap";
import LanguagePicker from "./LanguagePicker";

const NAV = [
  { href: "/", label: "Home" },
  { href: "/movies", label: "Movies" },
  { href: "/tv", label: "TV Shows" },
  { href: "/favorites", label: "My List" },
  { href: "/history", label: "History" },
];

const ADMIN_NAV = { href: "/admin", label: "Admin" };

export default function Navbar() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const { data: session, status } = useSession();
  const drawerRef = useRef<HTMLElement>(null);
  const closeDrawer = useCallback(() => setOpen(false), []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close drawer on route change.
  useEffect(() => {
    queueMicrotask(() => setOpen(false));
  }, [pathname]);

  // The drawer declared role="dialog" but had no aria-modal, no focus
  // containment and no Escape handler — it could only be dismissed by
  // clicking the overlay, which is mouse-only.
  useFocusTrap(drawerRef, open, closeDrawer);

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [open]);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <>
      <header
        className={cn(
          "fixed inset-x-0 top-0 z-50 transition-colors duration-300",
          scrolled
            ? "bg-[rgba(10,10,15,0.85)] backdrop-blur-md border-b border-white/5"
            : "bg-gradient-to-b from-black/70 to-transparent",
        )}
      >
        <div className="mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-10 h-16 flex items-center gap-3 sm:gap-6">
          {/* Hamburger — mobile only */}
          <button
            onClick={() => setOpen(true)}
            className="md:hidden p-2 -ml-2 rounded-md hover:bg-white/5 transition"
            aria-label="Open menu"
            aria-expanded={open}
          >
            <Menu className="size-5" />
          </button>

          <Link href="/" className="flex items-center gap-2 font-bold text-xl">
            <span className="text-[var(--color-accent)]" aria-hidden="true">▶</span>
            <span className="tracking-tight">Streamly</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "px-3 py-1.5 rounded-md text-sm transition-colors",
                  isActive(item.href)
                    ? "text-white"
                    : "text-[var(--color-muted)] hover:text-white",
                )}
              >
                {item.label}
              </Link>
            ))}
            {session?.user?.role === "ADMIN" && (
              <Link
                href={ADMIN_NAV.href}
                className={cn(
                  "px-3 py-1.5 rounded-md text-sm transition-colors",
                  isActive(ADMIN_NAV.href)
                    ? "text-[var(--color-accent)]"
                    : "text-[var(--color-accent)]/70 hover:text-[var(--color-accent)]",
                )}
              >
                {ADMIN_NAV.label}
              </Link>
            )}
          </nav>

          <div className="ml-auto flex items-center gap-1 sm:gap-2">
            <div className="hidden sm:block">
              <LanguagePicker />
            </div>
            <Link
              href="/search"
              className="p-2 rounded-md hover:bg-white/5 transition-colors"
              aria-label="Search"
            >
              <Search className="size-5" />
            </Link>
            {status === "authenticated" ? (
              <div className="flex items-center gap-2">
                <span className="hidden lg:inline text-sm text-[var(--color-muted)]">
                  {session.user.name ?? session.user.email}
                </span>
                <button
                  onClick={() => signOut()}
                  className="px-3 py-1.5 rounded-md text-sm bg-white/5 hover:bg-white/10 transition-colors"
                >
                  Sign out
                </button>
              </div>
            ) : (
              <Link
                href="/sign-in"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm bg-[var(--color-accent)] hover:bg-[var(--color-accent)]/90 transition-colors"
              >
                <User className="size-4" />
                <span className="hidden sm:inline">Sign in</span>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Mobile drawer */}
      {open && (
        <div className="md:hidden fixed inset-0 z-[60]">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <aside
            ref={drawerRef}
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
            className="absolute inset-y-0 left-0 w-72 max-w-[85vw] bg-[var(--color-bg)] border-r border-white/10 flex flex-col"
          >
            <div className="h-16 px-5 flex items-center justify-between border-b border-white/5">
              <Link
                href="/"
                className="flex items-center gap-2 font-bold text-xl"
              >
                <span className="text-[var(--color-accent)]" aria-hidden="true">▶</span>
                <span className="tracking-tight">Streamly</span>
              </Link>
              <button
                onClick={() => setOpen(false)}
                className="p-2 -mr-2 rounded-md hover:bg-white/5"
                aria-label="Close menu"
              >
                <X className="size-5" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto p-3">
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "block px-4 py-3 rounded-lg text-base transition-colors",
                    isActive(item.href)
                      ? "bg-white/10 text-white"
                      : "text-white/80 hover:bg-white/5 hover:text-white",
                  )}
                >
                  {item.label}
                </Link>
              ))}
              {session?.user?.role === "ADMIN" && (
                <Link
                  href={ADMIN_NAV.href}
                  className={cn(
                    "block px-4 py-3 rounded-lg text-base transition-colors text-[var(--color-accent)]",
                    isActive(ADMIN_NAV.href)
                      ? "bg-[var(--color-accent)]/10"
                      : "hover:bg-white/5",
                  )}
                >
                  {ADMIN_NAV.label}
                </Link>
              )}
            </nav>
            <div className="border-t border-white/5 p-4 space-y-3">
              <div>
                <div className="text-xs text-[var(--color-muted)] mb-2">
                  Language
                </div>
                <LanguagePicker />
              </div>
              {status === "authenticated" && (
                <div>
                  <div className="text-xs text-[var(--color-muted)] mb-2">
                    Signed in as
                  </div>
                  <div className="text-sm truncate mb-3">
                    {session.user.name ?? session.user.email}
                  </div>
                  <button
                    onClick={() => {
                      setOpen(false);
                      signOut();
                    }}
                    className="w-full py-2 rounded-md text-sm bg-white/5 hover:bg-white/10 transition"
                  >
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
