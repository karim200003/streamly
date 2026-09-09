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
    const movie = getServers("movie", 603).map((s) => s.url);
    expect(movie.some((u) => u.includes("/movie/603"))).toBe(true);

    // Every remaining provider uses the /tv/<id>/<season>/<episode> form.
    for (const url of getServers("tv", 1399, 2, 5).map((s) => s.url)) {
      expect(url).toContain("/tv/1399/2/5");
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
      if (!s.supportsProgress) continue;
      // Floored to whole seconds.
      expect(s.url).toContain("progress=125");
    }
  });

  it("omits the resume offset when there is nothing to resume", () => {
    for (const s of getServers("movie", 603, undefined, undefined, { startTime: 0 })) {
      expect(s.url).not.toContain("progress=");
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
