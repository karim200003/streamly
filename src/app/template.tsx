"use client";

import { m } from "framer-motion";

// Next.js convention: a `template.tsx` re-mounts on every navigation,
// so it's the right place for an entry transition.
//
// Important: animating ONLY `opacity` (no transform / filter / blur).
// Any of those would create a new containing block, which would break
// `position: fixed` descendants — most notably the player's theater
// mode and the trailer modal. Opacity-only keeps the page boundary
// transparent to fixed positioning while still feeling intentional.
export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <m.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      {children}
    </m.div>
  );
}
