import { describe, it, expect, vi, afterEach } from "vitest";

// The module reads NODE_ENV at import time, and vitest sets it to
// "test" (where the logger stays silent), so each case re-imports with
// the env it needs.
async function freshLogger(nodeEnv: string) {
  vi.resetModules();
  vi.stubEnv("NODE_ENV", nodeEnv);
  return (await import("./logger")).logger;
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("logger", () => {
  it("stays silent under NODE_ENV=test so output stays clean", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const logger = await freshLogger("test");
    logger("scope").error("boom", new Error("x"));
    expect(spy).not.toHaveBeenCalled();
  });

  it("emits one JSON line per entry in production", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const logger = await freshLogger("production");
    logger("favorites").error("add failed", new Error("db down"));

    expect(spy).toHaveBeenCalledOnce();
    const parsed = JSON.parse(spy.mock.calls[0][0] as string);
    expect(parsed.level).toBe("error");
    expect(parsed.scope).toBe("favorites");
    expect(parsed.message).toBe("add failed");
    expect(parsed.error.message).toBe("db down");
  });

  it("omits stack traces in production", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const logger = await freshLogger("production");
    logger("s").error("failed", new Error("secret path leak"));
    const parsed = JSON.parse(spy.mock.calls[0][0] as string);
    expect(parsed.error.stack).toBeUndefined();
  });

  it("keeps the Prisma error code, which is the actionable part", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const logger = await freshLogger("production");
    const err = Object.assign(new Error("not found"), { code: "P2025" });
    logger("s").error("delete failed", err);
    expect(JSON.parse(spy.mock.calls[0][0] as string).error.code).toBe("P2025");
  });

  it("handles non-Error throws without crashing", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const logger = await freshLogger("production");
    logger("s").error("weird", "just a string");
    expect(JSON.parse(spy.mock.calls[0][0] as string).error.message)
      .toBe("just a string");
  });

  it("drops debug output in production but keeps it in development", async () => {
    const prodSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const prodLogger = await freshLogger("production");
    prodLogger("s").debug("noisy");
    expect(prodSpy).not.toHaveBeenCalled();

    const devSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const devLogger = await freshLogger("development");
    devLogger("s").debug("noisy");
    expect(devSpy).toHaveBeenCalledOnce();
  });
});
