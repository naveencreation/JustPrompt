export interface ClientErrorReporter {
  capture(err: unknown, ctx?: Record<string, unknown>): void;
}

class ConsoleClientErrorReporter implements ClientErrorReporter {
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

export const clientErrors: ClientErrorReporter = new ConsoleClientErrorReporter();
