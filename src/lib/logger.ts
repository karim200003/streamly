import "server-only";

/**
 * Minimal structured logger.
 *
 * Replaces bare `console.error("[scope] thing failed:", err)` calls,
 * which had no levels, no consistent shape, and interpolated raw error
 * objects straight into the message. This emits one JSON object per
 * line in production so a log aggregator can parse it, and stays
 * human-readable in development.
 *
 * Deliberately not a logging library: the app needs levels, a scope and
 * safe error serialisation, and nothing here justifies the dependency.
 */

type Level = "debug" | "info" | "warn" | "error";

const isProduction = process.env.NODE_ENV === "production";
const isTest = process.env.NODE_ENV === "test";

/**
 * Reduce an unknown thrown value to something safe to serialise.
 *
 * Stack traces stay out of production output: they routinely contain
 * absolute paths and, for database errors, fragments of the failing
 * query.
 */
function serializeError(err: unknown): Record<string, unknown> {
  if (err instanceof Error) {
    return {
      name: err.name,
      message: err.message,
      // Prisma puts its error code here; it's the useful part.
      ...(typeof (err as unknown as { code?: unknown }).code === "string"
        ? { code: (err as unknown as { code: string }).code }
        : {}),
      ...(isProduction ? {} : { stack: err.stack }),
    };
  }
  return { message: String(err) };
}

function emit(
  level: Level,
  scope: string,
  message: string,
  context?: Record<string, unknown>,
) {
  if (isTest) return; // keep test output clean
  if (level === "debug" && isProduction) return;

  const entry = {
    level,
    scope,
    message,
    time: new Date().toISOString(),
    ...context,
  };

  const line = isProduction
    ? JSON.stringify(entry)
    : `[${scope}] ${message}${context ? ` ${JSON.stringify(context)}` : ""}`;

  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export interface Logger {
  debug(message: string, context?: Record<string, unknown>): void;
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  /** `err` is serialised safely; pass the caught value directly. */
  error(message: string, err?: unknown, context?: Record<string, unknown>): void;
}

/** A logger bound to one subsystem, e.g. `logger("favorites")`. */
export function logger(scope: string): Logger {
  return {
    debug: (m, c) => emit("debug", scope, m, c),
    info: (m, c) => emit("info", scope, m, c),
    warn: (m, c) => emit("warn", scope, m, c),
    error: (m, err, c) =>
      emit("error", scope, m, {
        ...(err === undefined ? {} : { error: serializeError(err) }),
        ...c,
      }),
  };
}
