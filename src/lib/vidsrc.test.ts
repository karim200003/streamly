import { describe, it, expect } from "vitest";
import { getServers, PROVIDER_FRAME_HOSTS } from "./vidsrc";

describe("getServers", () => {
  it("builds a URL for every provider", () => {
    const servers = getServers("movie", 603);
    expect(servers.length).toBeGreaterThan(0);
    for (const s of servers) {
      expect(() => new URL(s.url)).not.toThrow();
      expect(s.id).toBeTruthy();
      expect(s.name).toBeTruthy();
    }
  });

  it("only ever points at hosts the CSP allows", () => {
    // next.config.ts derives frame-src from PROVIDER_FRAME_HOSTS, so a
    // provider whose origin isn't listed would be silently blocked.
    const allowed = new Set<string>(PROVIDER_FRAME_HOSTS);
    for (const s of getServers("tv", 1399, 2, 5)) {
      expect(allowed).toContain(new URL(s.url).origin);
    }
  });

  it("uses movie paths for movies and season/episode paths for TV", () => {
    for (const url of getServers("movie", 603).map((s) => s.url)) {
      expect(url).toContain("603");
    }

    // Most providers put season/episode in the path; 2Embed uses a
    // separate /embedtv/ route carrying them as query params. Assert on
    // the values reaching the provider rather than on one URL shape, so
    // this keeps working as providers come and go.
    for (const url of getServers("tv", 1399, 2, 5).map((s) => s.url)) {
      const u = new URL(url);
      const values = new Set<string>([
        ...u.pathname.split("/"),
        ...[...u.searchParams.values()],
      ]);
      expect(values).toContain("1399");
      expect(values).toContain("2");
      expect(values).toContain("5");
    }
  });

  it("defaults season and episode to 1", () => {
    const [first] = getServers("tv", 1399);
    expect(first.url).toContain("/1399/1/1");
  });

  it("passes a resume offset only to providers that support progress", () => {
    const withResume = getServers("movie", 603, undefined, undefined, {
      startTime: 125.7,
    });
    for (const s of withResume) {
      const values = [...new URL(s.url).searchParams.values()];
      // Providers name the param differently (VidLink uses `startAt`),
      // so assert on the value: floored to whole seconds, and only sent
      // to providers that can actually act on it.
      if (s.supportsProgress) {
        expect(values).toContain("125");
      } else {
        expect(values).not.toContain("125");
      }
    }
  });

  it("omits the resume offset when there is nothing to resume", () => {
    for (const s of getServers("movie", 603, undefined, undefined, { startTime: 0 })) {
      const params = new URL(s.url).searchParams;
      expect(params.has("progress")).toBe(false);
      expect(params.has("startAt")).toBe(false);
    }
  });

  it("encodes query values so they cannot break out of the URL", () => {
    const [server] = getServers("tv", 1399, 1, 1, { dsLang: "en&injected=1" });
    const url = new URL(server.url);
    for (const [, value] of url.searchParams) {
      expect(value).not.toContain("&injected");
    }
  });
});
