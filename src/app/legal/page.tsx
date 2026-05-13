import type { Metadata } from "next";
import Link from "next/link";
import { Shield, Info, Mail } from "lucide-react";

export const metadata: Metadata = {
  title: "Disclaimer & Legal",
  description:
    "How Streamly handles content, copyright, third-party embeds, and DMCA takedown requests.",
  robots: { index: true, follow: true },
};

export default function LegalPage() {
  return (
    <div className="px-4 sm:px-6 lg:px-10 py-10">
      <div className="mx-auto max-w-3xl">
        <header className="mb-8 flex items-center gap-3">
          <Shield className="size-6 text-[var(--color-accent)]" />
          <h1 className="text-3xl font-bold tracking-tight">
            Disclaimer &amp; Legal
          </h1>
        </header>

        <article className="space-y-8 text-white/85 leading-relaxed">
          <section>
            <div className="flex items-center gap-2 text-[var(--color-accent)] text-sm font-medium uppercase tracking-wide mb-2">
              <Info className="size-4" /> Overview
            </div>
            <p>
              Streamly is a content-discovery interface for movies and TV
              series. It does <strong>not</strong> host, store, upload, or
              distribute any video files. All metadata (titles, posters,
              overviews, cast) is sourced from{" "}
              <a
                href="https://www.themoviedb.org/"
                target="_blank"
                rel="noreferrer"
                className="underline hover:text-white"
              >
                The Movie Database (TMDB)
              </a>
              , a public community-maintained database, in accordance with
              their{" "}
              <a
                href="https://www.themoviedb.org/documentation/api/terms-of-use"
                target="_blank"
                rel="noreferrer"
                className="underline hover:text-white"
              >
                terms of use
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">
              Third-party video embeds
            </h2>
            <p>
              The &quot;Watch&quot; pages display video players that are{" "}
              <strong>iframes pointing to independent third-party services</strong>{" "}
              (Videasy, Smashy, VidSrc, 2Embed, MultiEmbed). These services
              are operated by separate, unaffiliated parties. We have:
            </p>
            <ul className="list-disc pl-6 mt-3 space-y-1.5">
              <li>no control over the video content they serve;</li>
              <li>
                no business relationship, financial arrangement, or partnership
                with any of them;
              </li>
              <li>
                no ability to add, remove, or modify the catalog they expose.
              </li>
            </ul>
            <p className="mt-3">
              When you click &quot;Play&quot;, your browser communicates
              directly with the third-party host. Streamly is not a party to
              that communication. If a particular embed serves content that
              infringes copyright, the appropriate party to contact is the
              embed host, not Streamly.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">
              DMCA &amp; copyright concerns
            </h2>
            <p>
              If you are a rights-holder and believe a title is being
              improperly surfaced through this interface, please contact us
              with:
            </p>
            <ul className="list-disc pl-6 mt-3 space-y-1.5">
              <li>the title and TMDB ID of the work;</li>
              <li>your relationship to the work (rights-holder, agent);</li>
              <li>contact information.</li>
            </ul>
            <p className="mt-3">
              We will remove the title from our discovery surface (search,
              carousels, featured) within a reasonable timeframe. Note that
              this <em>does not</em> remove the title from third-party embed
              services — for that, you must contact those services directly.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">
              User-generated content
            </h2>
            <p>
              Comments and reviews are written by our users. We reserve the
              right to remove any content that is illegal, harassing, hateful,
              or violates a third party&apos;s rights. To report a comment,
              email us using the address below.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">Privacy</h2>
            <p>
              We store the minimum data needed to run the service: an account
              (email + hashed password), your favorites, your watch history,
              and your comments. We do not sell or share this data. You can
              delete your account at any time by contacting us; doing so
              removes all associated favorites, history, and comments.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">
              No warranty
            </h2>
            <p>
              The service is provided &quot;as is&quot;, without warranty of
              any kind. We make no guarantees about availability, accuracy of
              metadata, or playability of any specific title via the
              third-party embed services.
            </p>
          </section>

          <section>
            <div className="flex items-center gap-2 text-[var(--color-accent)] text-sm font-medium uppercase tracking-wide mb-2">
              <Mail className="size-4" /> Contact
            </div>
            <p>
              For DMCA, content reports, or account questions, please email
              the operator of this deployment. (If you are running this
              software yourself, replace this section with your real contact
              address before going public.)
            </p>
          </section>

          <p className="pt-6 text-xs text-[var(--color-muted)] border-t border-white/5">
            Last updated: 2026-05-08 ·{" "}
            <Link href="/" className="underline hover:text-white">
              Back to home
            </Link>
          </p>
        </article>
      </div>
    </div>
  );
}
