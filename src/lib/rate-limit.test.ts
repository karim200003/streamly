import { describe, it, expect } from "vitest";
import { getClientIp } from "./rate-limit";

function req(headers: Record<string, string>): Request {
  return new Request("https://example.com", { headers });
}

describe("getClientIp", () => {
  it("prefers Cloudflare's header above all others", () => {
    expect(
      getClientIp(
        req({
          "cf-connecting-ip": "1.1.1.1",
          "x-vercel-forwarded-for": "2.2.2.2",
          "x-forwarded-for": "3.3.3.3",
        }),
      ),
    ).toBe("1.1.1.1");
  });

  it("falls back to Vercel's header before generic XFF", () => {
    expect(
      getClientIp(
        req({ "x-vercel-forwarded-for": "2.2.2.2", "x-forwarded-for": "3.3.3.3" }),
      ),
    ).toBe("2.2.2.2");
  });

  it("takes the RIGHTMOST XFF entry, not the spoofable leftmost", () => {
    // A client can prepend anything to X-Forwarded-For; only the entry
    // added by the trusted hop closest to us can be relied on. Taking
    // the leftmost would let a caller forge a fresh rate-limit bucket
    // per request.
    expect(getClientIp(req({ "x-forwarded-for": "9.9.9.9, 8.8.8.8, 7.7.7.7" })))
      .toBe("7.7.7.7");
  });

  it("trims whitespace around entries", () => {
    expect(getClientIp(req({ "x-forwarded-for": "  5.5.5.5  " }))).toBe("5.5.5.5");
  });

  it("uses x-real-ip only as a last resort", () => {
    expect(getClientIp(req({ "x-real-ip": "4.4.4.4" }))).toBe("4.4.4.4");
  });

  it("returns a stable bucket when no header identifies the caller", () => {
    expect(getClientIp(req({}))).toBe("unknown");
  });
});
