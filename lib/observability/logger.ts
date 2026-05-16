import { config } from "@/lib/config";

const isProd = config.isProd;

export interface Logger {
  info(event: string, meta?: Record<string, unknown>): void;
  warn(event: string, meta?: Record<string, unknown>): void;
  error(event: string, meta?: Record<string, unknown>): void;
  debug(event: string, meta?: Record<string, unknown>): void;
}

class ConsoleLogger implements Logger {
  private log(level: string, event: string, meta?: Record<string, unknown>) {
    const entry = JSON.stringify({ level, event, ...meta, ts: new Date().toISOString() });
    if (level === "error") {
      console.error(entry);
    } else if (level === "warn") {
      console.warn(entry);
    } else {
      console.log(entry);
    }
  }

  info(event: string, meta?: Record<string, unknown>) { this.log("info", event, meta); }
  warn(event: string, meta?: Record<string, unknown>) { this.log("warn", event, meta); }
  error(event: string, meta?: Record<string, unknown>) { this.log("error", event, meta); }
  debug(event: string, meta?: Record<string, unknown>) {
    if (!isProd) this.log("debug", event, meta);
  }
}

export const logger: Logger = new ConsoleLogger();
