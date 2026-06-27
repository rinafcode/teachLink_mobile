import React from 'react';

/**
 * Gesture Performance Monitoring Utility
 *
 * Tracks FPS, frame drops, and responsiveness metrics during gesture interactions.
 * Helps identify performance bottlenecks and measure improvements.
 */

export interface PerformanceMetrics {
  fps: number;
  averageFps: number;
  minFps: number;
  maxFps: number;
  frameDrops: number;
  frameDropPercentage: number;
  totalFrames: number;
  durationMs: number;
  gestureLatency: number; // Time from gesture start to first frame
}

export interface GesturePerformanceMonitor {
  start(): void;
  end(): PerformanceMetrics;
  recordFrame(): void;
  isMonitoring(): boolean;
}

class GesturePerformanceMonitorImpl implements GesturePerformanceMonitor {
  private startTime: number = 0;
  private lastFrameTime: number = 0;
  private frameTimes: number[] = [];
  private frameDeltas: number[] = [];
  private isMonitoringState: boolean = false;
  private gestureLatency: number = 0;

  private static readonly TARGET_FPS = 60;
  private static readonly FRAME_TIME_MS = 1000 / GesturePerformanceMonitorImpl.TARGET_FPS; // ~16.67ms

  start(): void {
    this.startTime = performance.now();
    this.lastFrameTime = this.startTime;
    this.frameTimes = [];
    this.frameDeltas = [];
    this.isMonitoringState = true;
    this.gestureLatency = 0;
  }

  recordFrame(): void {
    if (!this.isMonitoringState) return;

    const now = performance.now();
    this.frameTimes.push(now);

    if (this.lastFrameTime > 0) {
      const delta = now - this.lastFrameTime;
      this.frameDeltas.push(delta);

      // Record first frame latency (gesture responsiveness)
      if (this.frameTimes.length === 2) {
        this.gestureLatency = this.frameDeltas[0];
      }
    }

    this.lastFrameTime = now;
  }

  end(): PerformanceMetrics {
    this.isMonitoringState = false;

    const endTime = performance.now();
    const durationMs = endTime - this.startTime;
    const totalFrames = this.frameTimes.length;

    // Calculate FPS metrics
    let currentFps = 60; // Default to target
    if (this.frameDeltas.length > 0) {
      const lastDelta = this.frameDeltas[this.frameDeltas.length - 1];
      currentFps = 1000 / lastDelta;
    }

    // Calculate average FPS
    const averageDelta =
      this.frameDeltas.length > 0
        ? this.frameDeltas.reduce((a, b) => a + b, 0) / this.frameDeltas.length
        : GesturePerformanceMonitorImpl.FRAME_TIME_MS;
    const averageFps = 1000 / averageDelta;

    // Find min and max FPS
    let minFps = 60;
    let maxFps = 60;
    if (this.frameDeltas.length > 0) {
      const fpsList = this.frameDeltas.map(delta => 1000 / delta);
      minFps = Math.min(...fpsList);
      maxFps = Math.max(...fpsList);
    }

    // Count frame drops (frames that took significantly longer than target)
    const frameDropThreshold = GesturePerformanceMonitorImpl.FRAME_TIME_MS * 1.5; // 25ms = 1.5x target
    const frameDrops = this.frameDeltas.filter(delta => delta > frameDropThreshold).length;
    const frameDropPercentage =
      this.frameDeltas.length > 0
        ? ((frameDrops / this.frameDeltas.length) * 100).toFixed(2)
        : '0.00';

    return {
      fps: Math.round(currentFps),
      averageFps: Math.round(averageFps),
      minFps: Math.round(minFps),
      maxFps: Math.round(maxFps),
      frameDrops,
      frameDropPercentage: parseFloat(frameDropPercentage),
      totalFrames,
      durationMs: Math.round(durationMs),
      gestureLatency: Math.round(this.gestureLatency),
    };
  }

  isMonitoring(): boolean {
    return this.isMonitoringState;
  }
}

export function createGesturePerformanceMonitor(): GesturePerformanceMonitor {
  return new GesturePerformanceMonitorImpl();
}

/**
 * Hook for monitoring gesture performance in components
 */
export function useGesturePerformanceMonitor(gestureType: string, enabled: boolean = false) {
  const monitorRef = React.useRef<GesturePerformanceMonitor>(createGesturePerformanceMonitor());
  const animationFrameRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    if (!enabled) return;

    const monitor = monitorRef.current;
    monitor.start();

    const recordFrame = () => {
      monitor.recordFrame();
      animationFrameRef.current = requestAnimationFrame(recordFrame);
    };

    animationFrameRef.current = requestAnimationFrame(recordFrame);

    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }

      const metrics = monitor.end();
      console.log(`[GesturePerformance] ${gestureType}:`, metrics);
    };
  }, [enabled, gestureType]);

  return monitorRef.current;
}
