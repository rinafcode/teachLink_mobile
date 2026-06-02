import { logger } from '../utils/logger';

import { mobileAnalyticsService } from './mobileAnalytics';

interface ImageMetricSample {
  loadTimeMs: number;
  usedFallback: boolean;
  dpr: number;
}

interface ImagePerformanceSnapshot {
  sampleCount: number;
  avgLoadTimeMs: number;
  fallbackRate: number;
  p95LoadTimeMs: number;
}

const MAX_SAMPLES = 300;

class ImagePerformanceService {
  private samples: ImageMetricSample[] = [];

  recordImageLoad(sample: ImageMetricSample): void {
    this.samples.push(sample);
    if (this.samples.length > MAX_SAMPLES) {
      this.samples.shift();
    }

    mobileAnalyticsService.trackPerformance('image_load_time', sample.loadTimeMs, {
      metric_name: 'image_load_time',
      used_fallback: sample.usedFallback,
      dpr: sample.dpr,
      optimization: 'lqip_webp_progressive',
    });
  }

  getSnapshot(): ImagePerformanceSnapshot {
    if (this.samples.length === 0) {
      return {
        sampleCount: 0,
        avgLoadTimeMs: 0,
        fallbackRate: 0,
        p95LoadTimeMs: 0,
      };
    }

    const sorted = [...this.samples].sort((a, b) => a.loadTimeMs - b.loadTimeMs);
    const total = this.samples.reduce((acc, item) => acc + item.loadTimeMs, 0);
    const fallbackCount = this.samples.filter(item => item.usedFallback).length;
    const p95Index = Math.max(0, Math.ceil(sorted.length * 0.95) - 1);

    return {
      sampleCount: this.samples.length,
      avgLoadTimeMs: Math.round(total / this.samples.length),
      fallbackRate: Number(((fallbackCount / this.samples.length) * 100).toFixed(2)),
      p95LoadTimeMs: sorted[p95Index]?.loadTimeMs ?? 0,
    };
  }

  logSnapshot(): void {
    const snapshot = this.getSnapshot();
    logger.info('ImagePerformance snapshot', snapshot);
  }
}

export const imagePerformanceService = new ImagePerformanceService();
