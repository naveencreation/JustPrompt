import { config } from "@/lib/config";

export interface ErrorReporter {
  capture(err: unknown, ctx?: Record<string, unknown>): void;
}

class ConsoleErrorReporter implements ErrorReporter {
  capture(err: unknown, ctx?: Record<string, unknown>) {
    console.error(
      JSON.stringify({
        level: "error",
        event: "error.captured",
        message: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
        ...ctx,
        ts: new Date().toISOString(),
      }),
    );
  }
}

function createErrorReporter(): ErrorReporter {
  if (config.errors === "sentry") {
    // Lazy import so Sentry SDK is never bundled unless env var is set
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { SentryErrorReporter } = require("./sentry") as { SentryErrorReporter: new () => ErrorReporter };
    return new SentryErrorReporter();
  }
  return new ConsoleErrorReporter();
}

export const errors: ErrorReporter = createErrorReporter();
