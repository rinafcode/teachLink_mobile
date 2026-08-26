// Fix for #960: Replace Math.random() fabrications with real measurements

export interface Metrics {
  responseTimeMs: number;
  requestCount: number;
  errorCount: number;
  lastMeasuredAt: number;
}

export class MetricsCollector {
  private requestCount = 0;
  private errorCount = 0;
  private responseTimes: number[] = [];

  /** Call at the start of a request; returns a function to call on completion. */
  recordRequest(): () => void {
    this.requestCount += 1;
    const start = Date.now();

    return () => {
      const elapsed = Date.now() - start;
      this.responseTimes.push(elapsed);
    };
  }

  recordError(): void {
    this.errorCount += 1;
  }

  /** Returns real aggregated metrics — no Math.random(). */
  collect(): Metrics {
    const total = this.responseTimes.reduce((sum, t) => sum + t, 0);
    const avgResponseTime =
      this.responseTimes.length > 0
        ? Math.round(total / this.responseTimes.length)
        : 0;

    return {
      responseTimeMs: avgResponseTime,
      requestCount: this.requestCount,
      errorCount: this.errorCount,
      lastMeasuredAt: Date.now(),
    };
  }

  reset(): void {
    this.requestCount = 0;
    this.errorCount = 0;
    this.responseTimes = [];
  }
}