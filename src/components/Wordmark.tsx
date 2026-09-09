/**
 * The Streamly mark: a rounded square with a play triangle punched out
 * of it.
 *
 * Inline SVG rather than a file in /public so it inherits `currentColor`
 * and needs no extra request. Decorative by default — every call site
 * wraps it in a link that carries the accessible name.
 */
export default function Wordmark({ className = "size-7" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 28 28"
      className={className}
      role="presentation"
      aria-hidden="true"
      focusable="false"
    >
      {/* `evenodd` cuts the triangle out of the square, so the glyph is
          one path and reads correctly on any background. */}
      <path
        fill="currentColor"
        fillRule="evenodd"
        clipRule="evenodd"
        d="M7 0h14a7 7 0 0 1 7 7v14a7 7 0 0 1-7 7H7a7 7 0 0 1-7-7V7a7 7 0 0 1 7-7Zm4.4 8.2a1 1 0 0 0-1.5.87v9.86a1 1 0 0 0 1.5.87l8.3-4.93a1 1 0 0 0 0-1.74L11.4 8.2Z"
      />
    </svg>
  );
}
