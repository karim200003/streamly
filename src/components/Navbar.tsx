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
  { href: "/tv", label: "Shows" },
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
      {/* Floating bar. It sits *over* the page rather than occupying a
          strip of it, so a full-bleed hero can run edge to edge behind
          it. No background of its own until you scroll — over artwork
          the glass pills supply all the separation that's needed. */}
      <header className="fixed inset-x-0 top-0 z-50 pointer-events-none">
        <div
          className={cn(
            "absolute inset-x-0 top-0 h-24 transition-opacity duration-300",
            "bg-gradient-to-b from-black/70 via-black/25 to-transparent",
            scrolled ? "opacity-0" : "opacity-100",
          )}
          aria-hidden
        />
        <div
          className={cn(
            "absolute inset-x-0 top-0 h-[4.5rem] transition-opacity duration-300",
            "bg-[rgba(8,8,11,0.72)] backdrop-blur-xl border-b border-white/[0.07]",
            scrolled ? "opacity-100" : "opacity-0",
          )}
          aria-hidden
        />

        <div className="relative mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-10 h-[4.5rem] flex items-center gap-3">
          {/* Hamburger — mobile only */}
          <button
            onClick={() => setOpen(true)}
            className="pointer-events-auto md:hidden size-10 -ml-2 grid place-items-center rounded-full hover:bg-white/10 transition"
            aria-label="Open menu"
            aria-expanded={open}
          >
            <Menu className="size-5" />
          </button>

          <Link
            href="/"
            className="pointer-events-auto flex items-center gap-2 font-bold text-lg tracking-tight shrink-0"
          >
            <span
              className="grid place-items-center size-7 rounded-lg bg-[var(--color-accent)] text-white text-[0.7rem]"
              aria-hidden="true"
            >
              ▶
            </span>
            <span>Streamly</span>
          </Link>

          {/* Desktop nav — one frosted container, active item as a solid
              pill. Reads as a control rather than a row of text links. */}
          <nav className="pointer-events-auto hidden md:flex items-center gap-1 ml-auto p-1 rounded-full glass">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive(item.href) ? "page" : undefined}
                className={cn(
                  "px-4 py-1.5 rounded-full text-sm font-medium transition-colors",
                  isActive(item.href)
                    ? "bg-white text-black"
                    : "text-white/70 hover:text-white hover:bg-white/10",
                )}
              >
                {item.label}
              </Link>
            ))}
            {session?.user?.role === "ADMIN" && (
              <Link
                href={ADMIN_NAV.href}
                aria-current={isActive(ADMIN_NAV.href) ? "page" : undefined}
                className={cn(
                  "px-4 py-1.5 rounded-full text-sm font-medium transition-colors",
                  isActive(ADMIN_NAV.href)
                    ? "bg-[var(--color-accent)] text-white"
                    : "text-[var(--color-accent)] hover:bg-[var(--color-accent)]/15",
                )}
              >
                {ADMIN_NAV.label}
              </Link>
            )}
          </nav>

          <div className="pointer-events-auto ml-auto md:ml-2 flex items-center gap-1.5">
            <div className="hidden lg:block">
              <LanguagePicker />
            </div>
            <Link
              href="/search"
              className="size-10 grid place-items-center rounded-full glass hover:bg-white/15 transition"
              aria-label="Search"
            >
              <Search className="size-[1.05rem]" />
            </Link>
            {status === "authenticated" ? (
              <button
                onClick={() => signOut()}
                className="px-4 py-2 rounded-full text-sm font-medium glass hover:bg-white/15 transition"
                title={session.user.name ?? session.user.email ?? "Sign out"}
              >
                Sign out
              </button>
            ) : (
              <Link
                href="/sign-in"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold bg-[var(--color-accent)] hover:bg-[var(--color-accent)]/90 transition"
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
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <aside
            ref={drawerRef}
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
            className="absolute inset-y-0 left-0 w-72 max-w-[85vw] bg-[var(--color-bg-2)] border-r border-white/10 flex flex-col"
          >
            <div className="h-[4.5rem] px-5 flex items-center justify-between border-b border-white/[0.07]">
              <Link
                href="/"
                className="flex items-center gap-2 font-bold text-lg tracking-tight"
              >
                <span
                  className="grid place-items-center size-7 rounded-lg bg-[var(--color-accent)] text-white text-[0.7rem]"
                  aria-hidden="true"
                >
                  ▶
                </span>
                <span>Streamly</span>
              </Link>
              <button
                onClick={() => setOpen(false)}
                className="size-10 -mr-2 grid place-items-center rounded-full hover:bg-white/10"
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
                  aria-current={isActive(item.href) ? "page" : undefined}
                  className={cn(
                    "block px-4 py-3 rounded-xl text-base font-medium transition-colors",
                    isActive(item.href)
                      ? "bg-white text-black"
                      : "text-white/80 hover:bg-white/10 hover:text-white",
                  )}
                >
                  {item.label}
                </Link>
              ))}
              {session?.user?.role === "ADMIN" && (
                <Link
                  href={ADMIN_NAV.href}
                  className={cn(
                    "block px-4 py-3 rounded-xl text-base font-medium transition-colors text-[var(--color-accent)]",
                    isActive(ADMIN_NAV.href)
                      ? "bg-[var(--color-accent)]/15"
                      : "hover:bg-white/5",
                  )}
                >
                  {ADMIN_NAV.label}
                </Link>
              )}
            </nav>
            <div className="border-t border-white/[0.07] p-4 space-y-3">
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
                    className="w-full py-2.5 rounded-full text-sm font-medium bg-white/10 hover:bg-white/15 transition"
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
