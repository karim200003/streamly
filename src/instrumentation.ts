export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { validateProductionEnv } = await import("@/lib/env");
    validateProductionEnv();

    // Surface a degraded rate-limit configuration at boot rather than
    // discovering it under load.
    const { warnIfRateLimitsAreLocal } = await import("@/lib/rate-limit");
    warnIfRateLimitsAreLocal();
  }
}
