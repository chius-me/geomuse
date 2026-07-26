const defaultFrameSampleLimit = 120;
const inactiveFrameThresholdMs = 250;

export type GlobePerformanceSnapshot = {
  mapLoadMs: number | null;
  averageFrameMs: number | null;
  p95FrameMs: number | null;
  frameSampleCount: number;
  longTaskCount: number;
  maxLongTaskMs: number | null;
};

type GlobePerformanceAccumulatorOptions = {
  startedAt: number;
  frameSampleLimit?: number;
};

export class GlobePerformanceAccumulator {
  private readonly startedAt: number;
  private readonly frameSampleLimit: number;
  private readonly frameSamples: number[] = [];
  private lastFrameAt: number | null = null;
  private mapLoadMs: number | null = null;
  private longTaskCount = 0;
  private maxLongTaskMs: number | null = null;

  constructor({
    startedAt,
    frameSampleLimit = defaultFrameSampleLimit,
  }: GlobePerformanceAccumulatorOptions) {
    this.startedAt = startedAt;
    this.frameSampleLimit = Math.max(1, frameSampleLimit);
  }

  recordMapLoad(loadedAt: number) {
    this.mapLoadMs = Math.max(0, loadedAt - this.startedAt);
  }

  recordFrame(renderedAt: number) {
    if (this.lastFrameAt === null) {
      this.lastFrameAt = renderedAt;
      return;
    }

    const duration = renderedAt - this.lastFrameAt;
    this.lastFrameAt = renderedAt;

    if (duration <= 0 || duration > inactiveFrameThresholdMs) {
      return;
    }

    this.frameSamples.push(duration);

    if (this.frameSamples.length > this.frameSampleLimit) {
      this.frameSamples.shift();
    }
  }

  recordLongTask(duration: number) {
    if (duration <= 0) {
      return;
    }

    this.longTaskCount += 1;
    this.maxLongTaskMs = Math.max(this.maxLongTaskMs ?? 0, duration);
  }

  snapshot(): GlobePerformanceSnapshot {
    if (this.frameSamples.length === 0) {
      return {
        mapLoadMs: this.mapLoadMs,
        averageFrameMs: null,
        p95FrameMs: null,
        frameSampleCount: 0,
        longTaskCount: this.longTaskCount,
        maxLongTaskMs: this.maxLongTaskMs,
      };
    }

    const totalFrameMs = this.frameSamples.reduce(
      (total, duration) => total + duration,
      0,
    );
    const sortedFrameSamples = this.frameSamples.toSorted(
      (left, right) => left - right,
    );
    const p95Index = Math.ceil(sortedFrameSamples.length * 0.95) - 1;

    return {
      mapLoadMs: this.mapLoadMs,
      averageFrameMs: totalFrameMs / this.frameSamples.length,
      p95FrameMs: sortedFrameSamples[p95Index] ?? null,
      frameSampleCount: this.frameSamples.length,
      longTaskCount: this.longTaskCount,
      maxLongTaskMs: this.maxLongTaskMs,
    };
  }
}
