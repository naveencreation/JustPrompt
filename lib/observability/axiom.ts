import { config } from "@/lib/config";
import type { Logger } from "./logger";

/**
 * Axiom logger — sends structured logs to Axiom for Tier 1+.
 * Requires AXIOM_TOKEN and AXIOM_DATASET env vars.
 *
 * Initialized only when both env vars are present; import is deferred to avoid
 * bundling unnecessary code.
 */
export class AxiomLogger implements Logger {
  private readonly url: string;
  private readonly token: string;
  private readonly dataset: string;

  constructor() {
    const token = config.axiom.token;
    const dataset = config.axiom.dataset;
    if (!token || !dataset) {
      throw new Error("AxiomLogger requires AXIOM_TOKEN and AXIOM_DATASET to be set.");
    }
    this.token = token;
    this.dataset = dataset;
    this.url = `https://api.axiom.co/v1/datasets/${this.dataset}/ingest`;
  }

  private async send(level: string, event: string, meta?: Record<string, unknown>): Promise<void> {
    try {
      const payload = {
        level,
        event,
        ...meta,
        ts: new Date().toISOString(),
      };

      await fetch(this.url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify([payload]),
        cache: "no-store",
      });
    } catch {
      // Silently fail to avoid breaking the application if Axiom is unavailable
    }
  }

  info(event: string, meta?: Record<string, unknown>): void {
    this.send("info", event, meta).catch(() => {});
  }

  warn(event: string, meta?: Record<string, unknown>): void {
    this.send("warn", event, meta).catch(() => {});
  }

  error(event: string, meta?: Record<string, unknown>): void {
    this.send("error", event, meta).catch(() => {});
  }

  debug(event: string, meta?: Record<string, unknown>): void {
    // Debug logs are typically not sent to external services in production
    // Only log locally in development
    if (config.isDev) {
      console.debug(JSON.stringify({ level: "debug", event, ...meta, ts: new Date().toISOString() }));
    }
  }
}
