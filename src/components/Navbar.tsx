"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Search,
  Settings,
  User,
  Menu,
  X,
  Home,
  Clapperboard,
  Tv,
  Bookmark,
  History,
  type LucideIcon,
} from "lucide-react";
import { useSession, signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import { useFocusTrap } from "@/lib/use-focus-trap";
import LanguagePicker from "./LanguagePicker";
import Wordmark from "./Wordmark";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

// The icon rides along with every item but only renders on the active
// one, which is what gives the selected pill its leading glyph.
const NAV: NavItem[] = [
  { href: "/", label: "Home", icon: Home },
  { href: "/movies", label: "Movies", icon: Clapperboard },
  { href: "/tv", label: "Shows", icon: Tv },
  { href: "/favorites", label: "My List", icon: Bookmark },
  { href: "/history", label: "History", icon: History },
];

const ADMIN_NAV: NavItem = {
  href: "/admin",
  label: "Admin",
  icon: Settings,
};

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

  const items = [
    ...NAV,
    ...(session?.user?.role === "ADMIN" ? [ADMIN_NAV] : []),
  ];

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
            "bg-gradient-to-b from-black/60 via-black/20 to-transparent",
            scrolled ? "opacity-0" : "opacity-100",
          )}
          aria-hidden
        />
        <div
          className={cn(
            "absolute inset-x-0 top-0 h-[var(--nav-h)] transition-opacity duration-300",
            "bg-[rgba(8,8,11,0.72)] backdrop-blur-xl border-b border-white/[0.07]",
            scrolled ? "opacity-100" : "opacity-0",
          )}
          aria-hidden
        />

        <div className="relative mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-10 h-[var(--nav-h)] flex items-center gap-3">
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
            className="pointer-events-auto flex items-center gap-2.5 shrink-0"
            aria-label="Streamly — home"
          >
            <Wordmark />
            {/* The mark alone carries the brand at the top-left corner,
                the way the rest of the chrome stays out of the artwork's
                way. The name still ships for wider screens. */}
            <span className="hidden sm:block font-semibold text-[0.975rem] tracking-tight">
              Streamly
            </span>
          </Link>

          {/* Desktop nav — one frosted container holding the links, then
              a hairline, then the icon-only actions. Reads as a single
              control rather than a row of loose text links. */}
          <div className="pointer-events-auto hidden md:flex items-center gap-1 ml-auto p-1 rounded-full glass">
            <nav className="flex items-center gap-1" aria-label="Primary">
              {items.map((item) => {
                const active = isActive(item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full text-sm font-medium transition-colors",
                      active
                        ? "bg-white text-black pl-3 pr-4 py-1.5"
                        : "text-white/70 hover:text-white hover:bg-white/10 px-4 py-1.5",
                    )}
                  >
                    {active && <Icon className="size-4" aria-hidden />}
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <span className="w-px h-5 bg-white/15 mx-1" aria-hidden />

            <Link
              href="/search"
              className="size-8 grid place-items-center rounded-full text-white/75 hover:text-white hover:bg-white/10 transition"
              aria-label="Search"
            >
              <Search className="size-[1.05rem]" />
            </Link>
            <Link
              href="/settings"
              aria-current={isActive("/settings") ? "page" : undefined}
              className={cn(
                "size-8 grid place-items-center rounded-full transition",
                isActive("/settings")
                  ? "bg-white text-black"
                  : "text-white/75 hover:text-white hover:bg-white/10",
              )}
              aria-label="Settings"
            >
              <Settings className="size-[1.05rem]" />
            </Link>
          </div>

          <div className="pointer-events-auto ml-auto md:ml-2 flex items-center gap-2">
            {/* Mobile-only search; the desktop one lives in the nav pill.
                The wrapper owns the breakpoint because `.btn-icon` sets
                `display`, and it wins over `md:hidden` in the cascade. */}
            <div className="md:hidden">
              <Link href="/search" className="btn-icon" aria-label="Search">
                <Search className="size-[1.05rem]" />
              </Link>
            </div>
            {status === "authenticated" ? (
              <button
                onClick={() => signOut()}
                className="hidden sm:inline-flex items-center px-4 py-2 rounded-full text-sm font-medium glass hover:bg-white/15 transition"
                title={session.user.name ?? session.user.email ?? "Sign out"}
              >
                Sign out
              </button>
            ) : (
              <Link
                href="/sign-in"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium glass hover:bg-white/15 transition"
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
            <div className="h-[var(--nav-h)] px-5 flex items-center justify-between border-b border-white/[0.07]">
              <Link
                href="/"
                className="flex items-center gap-2.5 font-semibold tracking-tight"
              >
                <Wordmark />
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
            <nav className="flex-1 overflow-y-auto p-3" aria-label="Primary">
              {[...items, { href: "/settings", label: "Settings", icon: Settings }].map(
                (item) => {
                  const active = isActive(item.href);
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium transition-colors",
                        active
                          ? "bg-white text-black"
                          : "text-white/80 hover:bg-white/10 hover:text-white",
                      )}
                    >
                      <Icon className="size-[1.15rem]" aria-hidden />
                      {item.label}
                    </Link>
                  );
                },
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
