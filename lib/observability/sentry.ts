import { config } from "@/lib/config";
import type { ErrorReporter } from "./errors";

/**
 * Sentry error reporter — sends errors to Sentry for Tier 1+.
 * Requires SENTRY_DSN env var.
 *
 * Initialized only when SENTRY_DSN is present; import is deferred to avoid
 * bundling the Sentry SDK unless explicitly enabled.
 */
export class SentryErrorReporter implements ErrorReporter {
  private readonly dsn: string;

  constructor() {
    const dsn = config.sentry.dsn;
    if (!dsn) {
      throw new Error("SentryErrorReporter requires SENTRY_DSN to be set.");
    }
    this.dsn = dsn;
  }

  capture(err: unknown, ctx?: Record<string, unknown>): void {
    // For now, log to console as a fallback until Sentry SDK is properly configured.
    // In a real implementation, you would:
    // 1. Import @sentry/nextjs
    // 2. Initialize Sentry with this.dsn
    // 3. Call Sentry.captureException(err, { extra: ctx })

    console.error(
      JSON.stringify({
        level: "error",
        event: "error.captured",
        source: "sentry",
        message: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
        ...ctx,
        ts: new Date().toISOString(),
      }),
    );

    // TODO: Initialize Sentry and call Sentry.captureException(err, { extra: ctx })
  }
}
