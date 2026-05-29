/**
 * Performance Audit System Tests
 */

import { beforeEach, describe, expect, it } from '@jest/globals';

import { BundleAnalyzer } from '../../audit/analyzers/BundleAnalyzer';
import { MemoryAnalyzer, RenderAnalyzer } from '../../audit/analyzers/MemoryAnalyzer';
import { DependencyAnalyzer, NetworkAnalyzer } from '../../audit/analyzers/NetworkAnalyzer';
import { AssetAnalyzer, RuntimeAnalyzer } from '../../audit/analyzers/RuntimeAnalyzer';
import { PerformanceAuditor } from '../../audit/PerformanceAuditor';
import { RecommendationEngine } from '../../audit/RecommendationEngine';
import { ReportGenerator } from '../../audit/ReportGenerator';

describe('Performance Audit System', () => {
  let projectRoot: string;

  beforeEach(() => {
    projectRoot = process.cwd();
  });

  // ========================================================================
  // Bundle Analyzer Tests
  // ========================================================================
  describe('BundleAnalyzer', () => {
    it('should initialize successfully', () => {
      const analyzer = new BundleAnalyzer(projectRoot);
      expect(analyzer).toBeDefined();
    });

    it('should validate', async () => {
      const analyzer = new BundleAnalyzer(projectRoot);
      const result = await analyzer.validate();
      expect(typeof result).toBe('boolean');
    });

    it('should analyze bundle', async () => {
      const analyzer = new BundleAnalyzer(projectRoot);
      const analysis = await analyzer.analyze();

      expect(analysis).toBeDefined();
      expect(analysis.totalSize).toBeGreaterThanOrEqual(0);
      expect(analysis.gzipSize).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(analysis.chunks)).toBe(true);
      expect(Array.isArray(analysis.largeFiles)).toBe(true);
    });
  });

  // ========================================================================
  // Memory Analyzer Tests
  // ========================================================================
  describe('MemoryAnalyzer', () => {
    it('should initialize successfully', () => {
      const analyzer = new MemoryAnalyzer(projectRoot);
      expect(analyzer).toBeDefined();
    });

    it('should analyze memory', async () => {
      const analyzer = new MemoryAnalyzer(projectRoot);
      const analysis = await analyzer.analyze();

      expect(analysis).toBeDefined();
      expect(analysis.heapUsed).toBeGreaterThanOrEqual(0);
      expect(analysis.heapTotal).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(analysis.estimatedMemoryLeaks)).toBe(true);
    });
  });

  // ========================================================================
  // Render Analyzer Tests
  // ========================================================================
  describe('RenderAnalyzer', () => {
    it('should initialize successfully', () => {
      const analyzer = new RenderAnalyzer(projectRoot);
      expect(analyzer).toBeDefined();
    });

    it('should analyze render performance', async () => {
      const analyzer = new RenderAnalyzer(projectRoot);
      const analysis = await analyzer.analyze();

      expect(analysis).toBeDefined();
      expect(analysis.avgRenderTime).toBeGreaterThanOrEqual(0);
      expect(analysis.maxRenderTime).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(analysis.slowComponents)).toBe(true);
    });
  });

  // ========================================================================
  // Network Analyzer Tests
  // ========================================================================
  describe('NetworkAnalyzer', () => {
    it('should initialize successfully', () => {
      const analyzer = new NetworkAnalyzer(projectRoot);
      expect(analyzer).toBeDefined();
    });

    it('should analyze network', async () => {
      const analyzer = new NetworkAnalyzer(projectRoot);
      const analysis = await analyzer.analyze();

      expect(analysis).toBeDefined();
      expect(analysis.totalRequests).toBeGreaterThanOrEqual(0);
      expect(analysis.averageLatency).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(analysis.slowEndpoints)).toBe(true);
    });
  });

  // ========================================================================
  // Dependency Analyzer Tests
  // ========================================================================
  describe('DependencyAnalyzer', () => {
    it('should initialize successfully', () => {
      const analyzer = new DependencyAnalyzer(projectRoot);
      expect(analyzer).toBeDefined();
    });

    it('should analyze dependencies', async () => {
      const analyzer = new DependencyAnalyzer(projectRoot);
      const analysis = await analyzer.analyze();

      expect(analysis).toBeDefined();
      expect(analysis.totalDependencies).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(analysis.vulnerabilities)).toBe(true);
    });
  });

  // ========================================================================
  // Runtime Analyzer Tests
  // ========================================================================
  describe('RuntimeAnalyzer', () => {
    it('should initialize successfully', () => {
      const analyzer = new RuntimeAnalyzer(projectRoot);
      expect(analyzer).toBeDefined();
    });

    it('should analyze runtime performance', async () => {
      const analyzer = new RuntimeAnalyzer(projectRoot);
      const analysis = await analyzer.analyze();

      expect(analysis).toBeDefined();
      expect(analysis.startupTime).toBeGreaterThanOrEqual(0);
      expect(analysis.cpuUsage).toBeDefined();
    });
  });

  // ========================================================================
  // Asset Analyzer Tests
  // ========================================================================
  describe('AssetAnalyzer', () => {
    it('should initialize successfully', () => {
      const analyzer = new AssetAnalyzer(projectRoot);
      expect(analyzer).toBeDefined();
    });

    it('should analyze assets', async () => {
      const analyzer = new AssetAnalyzer(projectRoot);
      const analysis = await analyzer.analyze();

      expect(analysis).toBeDefined();
      expect(analysis.totalAssetSize).toBeGreaterThanOrEqual(0);
      expect(analysis.images).toBeDefined();
      expect(analysis.fonts).toBeDefined();
    });
  });

  // ========================================================================
  // Recommendation Engine Tests
  // ========================================================================
  describe('RecommendationEngine', () => {
    it('should generate recommendations from report', () => {
      const mockReport = {
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        environment: 'test',
        duration: 1000,
        overallScore: 75,
        trend: 'stable' as const,
        bundleAnalysis: {
          totalSize: 6000000,
          gzipSize: 300000,
          chunks: [],
          largeFiles: [],
          duplicateModules: [],
          unusedDependencies: [],
          largeDevDependencies: [],
        },
        memoryAnalysis: {
          heapUsed: 100000,
          heapTotal: 200000,
          external: 0,
          rss: 300000,
          jsHeapSizeLimit: 400000,
          estimatedMemoryLeaks: [],
          largeObjects: [],
        },
        renderAnalysis: {
          avgRenderTime: 16,
          maxRenderTime: 50,
          slowComponents: [],
          rerenderIssues: [],
          animationPerformance: {
            fps: 60,
            droppedFrames: 0,
            jankFreeFrames: 60,
            totalAnimations: 0,
          },
        },
        networkAnalysis: {
          totalRequests: 20,
          totalDataTransferred: 1000000,
          averageLatency: 200,
          slowEndpoints: [],
          redundantRequests: [],
          unoptimizedAssets: [],
          cacheMetrics: {
            hitRate: 0.8,
            missRate: 0.2,
            averageAge: 3600,
            staleRequests: 0,
          },
        },
        dependencyAnalysis: {
          totalDependencies: 50,
          outdatedDependencies: [],
          vulnerabilities: [],
          unusedDependencies: [],
          largeTransitiveDependencies: [],
          licenseCompliance: [],
        },
        runtimeAnalysis: {
          startupTime: 1000,
          timeToInteractive: 1500,
          firstPaint: 800,
          firstContentfulPaint: 900,
          cpuUsage: {
            average: 25,
            peak: 60,
            distribution: {},
          },
          jsExecutionTime: 200,
          eventLoopLag: 10,
        },
        assetAnalysis: {
          images: {
            totalSize: 500000,
            largestImages: [],
            unusedImages: [],
            formatOpportunities: [],
          },
          fonts: {
            totalSize: 100000,
            loadedFonts: [],
            unusedFontVariants: [],
          },
          totalAssetSize: 600000,
          unoptimizedAssets: [],
        },
        recommendations: [],
        executiveSummary: {
          title: 'Test Summary',
          overview: 'Test overview',
          keyFindings: [],
          topPriorities: [],
          estimatedImpact: {},
          nextSteps: [],
        },
      };

      const recommendations = RecommendationEngine.generateRecommendations(mockReport);

      expect(Array.isArray(recommendations)).toBe(true);
      expect(recommendations.length).toBeGreaterThan(0);

      // Check that recommendations have required fields
      for (const rec of recommendations) {
        expect(rec.id).toBeDefined();
        expect(rec.title).toBeDefined();
        expect(rec.severity).toBeDefined();
        expect(rec.priority).toBeGreaterThanOrEqual(0);
        expect(rec.priority).toBeLessThanOrEqual(100);
      }
    });
  });

  // ========================================================================
  // Report Generator Tests
  // ========================================================================
  describe('ReportGenerator', () => {
    it('should generate JSON report', () => {
      const mockReport = {
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        environment: 'test',
        duration: 1000,
        overallScore: 75,
        trend: 'stable' as const,
        bundleAnalysis: {
          totalSize: 1000000,
          gzipSize: 300000,
          chunks: [],
          largeFiles: [],
          duplicateModules: [],
          unusedDependencies: [],
          largeDevDependencies: [],
        },
        memoryAnalysis: {
          heapUsed: 100000,
          heapTotal: 200000,
          external: 0,
          rss: 300000,
          jsHeapSizeLimit: 400000,
          estimatedMemoryLeaks: [],
          largeObjects: [],
        },
        renderAnalysis: {
          avgRenderTime: 16,
          maxRenderTime: 50,
          slowComponents: [],
          rerenderIssues: [],
          animationPerformance: {
            fps: 60,
            droppedFrames: 0,
            jankFreeFrames: 60,
            totalAnimations: 0,
          },
        },
        networkAnalysis: {
          totalRequests: 20,
          totalDataTransferred: 1000000,
          averageLatency: 200,
          slowEndpoints: [],
          redundantRequests: [],
          unoptimizedAssets: [],
          cacheMetrics: {
            hitRate: 0.8,
            missRate: 0.2,
            averageAge: 3600,
            staleRequests: 0,
          },
        },
        dependencyAnalysis: {
          totalDependencies: 50,
          outdatedDependencies: [],
          vulnerabilities: [],
          unusedDependencies: [],
          largeTransitiveDependencies: [],
          licenseCompliance: [],
        },
        runtimeAnalysis: {
          startupTime: 1000,
          timeToInteractive: 1500,
          firstPaint: 800,
          firstContentfulPaint: 900,
          cpuUsage: {
            average: 25,
            peak: 60,
            distribution: {},
          },
          jsExecutionTime: 200,
          eventLoopLag: 10,
        },
        assetAnalysis: {
          images: {
            totalSize: 500000,
            largestImages: [],
            unusedImages: [],
            formatOpportunities: [],
          },
          fonts: {
            totalSize: 100000,
            loadedFonts: [],
            unusedFontVariants: [],
          },
          totalAssetSize: 600000,
          unoptimizedAssets: [],
        },
        recommendations: [],
        executiveSummary: {
          title: 'Test Summary',
          overview: 'Test overview',
          keyFindings: [],
          topPriorities: [],
          estimatedImpact: {},
          nextSteps: [],
        },
      };

      const json = ReportGenerator.generateJSON(mockReport);

      expect(typeof json).toBe('string');
      expect(json.length).toBeGreaterThan(0);
      expect(() => JSON.parse(json)).not.toThrow();
    });

    it('should generate Markdown report', () => {
      const mockReport = {
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        environment: 'test',
        duration: 1000,
        overallScore: 75,
        trend: 'stable' as const,
        bundleAnalysis: {
          totalSize: 1000000,
          gzipSize: 300000,
          chunks: [],
          largeFiles: [],
          duplicateModules: [],
          unusedDependencies: [],
          largeDevDependencies: [],
        },
        memoryAnalysis: {
          heapUsed: 100000,
          heapTotal: 200000,
          external: 0,
          rss: 300000,
          jsHeapSizeLimit: 400000,
          estimatedMemoryLeaks: [],
          largeObjects: [],
        },
        renderAnalysis: {
          avgRenderTime: 16,
          maxRenderTime: 50,
          slowComponents: [],
          rerenderIssues: [],
          animationPerformance: {
            fps: 60,
            droppedFrames: 0,
            jankFreeFrames: 60,
            totalAnimations: 0,
          },
        },
        networkAnalysis: {
          totalRequests: 20,
          totalDataTransferred: 1000000,
          averageLatency: 200,
          slowEndpoints: [],
          redundantRequests: [],
          unoptimizedAssets: [],
          cacheMetrics: {
            hitRate: 0.8,
            missRate: 0.2,
            averageAge: 3600,
            staleRequests: 0,
          },
        },
        dependencyAnalysis: {
          totalDependencies: 50,
          outdatedDependencies: [],
          vulnerabilities: [],
          unusedDependencies: [],
          largeTransitiveDependencies: [],
          licenseCompliance: [],
        },
        runtimeAnalysis: {
          startupTime: 1000,
          timeToInteractive: 1500,
          firstPaint: 800,
          firstContentfulPaint: 900,
          cpuUsage: {
            average: 25,
            peak: 60,
            distribution: {},
          },
          jsExecutionTime: 200,
          eventLoopLag: 10,
        },
        assetAnalysis: {
          images: {
            totalSize: 500000,
            largestImages: [],
            unusedImages: [],
            formatOpportunities: [],
          },
          fonts: {
            totalSize: 100000,
            loadedFonts: [],
            unusedFontVariants: [],
          },
          totalAssetSize: 600000,
          unoptimizedAssets: [],
        },
        recommendations: [],
        executiveSummary: {
          title: 'Test Summary',
          overview: 'Test overview',
          keyFindings: [],
          topPriorities: [],
          estimatedImpact: {},
          nextSteps: [],
        },
      };

      const markdown = ReportGenerator.generateMarkdown(mockReport);

      expect(typeof markdown).toBe('string');
      expect(markdown.includes('# Performance Audit Report')).toBe(true);
      expect(markdown.includes('##')).toBe(true);
    });

    it('should generate HTML report', () => {
      const mockReport = {
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        environment: 'test',
        duration: 1000,
        overallScore: 75,
        trend: 'stable' as const,
        bundleAnalysis: {
          totalSize: 1000000,
          gzipSize: 300000,
          chunks: [],
          largeFiles: [],
          duplicateModules: [],
          unusedDependencies: [],
          largeDevDependencies: [],
        },
        memoryAnalysis: {
          heapUsed: 100000,
          heapTotal: 200000,
          external: 0,
          rss: 300000,
          jsHeapSizeLimit: 400000,
          estimatedMemoryLeaks: [],
          largeObjects: [],
        },
        renderAnalysis: {
          avgRenderTime: 16,
          maxRenderTime: 50,
          slowComponents: [],
          rerenderIssues: [],
          animationPerformance: {
            fps: 60,
            droppedFrames: 0,
            jankFreeFrames: 60,
            totalAnimations: 0,
          },
        },
        networkAnalysis: {
          totalRequests: 20,
          totalDataTransferred: 1000000,
          averageLatency: 200,
          slowEndpoints: [],
          redundantRequests: [],
          unoptimizedAssets: [],
          cacheMetrics: {
            hitRate: 0.8,
            missRate: 0.2,
            averageAge: 3600,
            staleRequests: 0,
          },
        },
        dependencyAnalysis: {
          totalDependencies: 50,
          outdatedDependencies: [],
          vulnerabilities: [],
          unusedDependencies: [],
          largeTransitiveDependencies: [],
          licenseCompliance: [],
        },
        runtimeAnalysis: {
          startupTime: 1000,
          timeToInteractive: 1500,
          firstPaint: 800,
          firstContentfulPaint: 900,
          cpuUsage: {
            average: 25,
            peak: 60,
            distribution: {},
          },
          jsExecutionTime: 200,
          eventLoopLag: 10,
        },
        assetAnalysis: {
          images: {
            totalSize: 500000,
            largestImages: [],
            unusedImages: [],
            formatOpportunities: [],
          },
          fonts: {
            totalSize: 100000,
            loadedFonts: [],
            unusedFontVariants: [],
          },
          totalAssetSize: 600000,
          unoptimizedAssets: [],
        },
        recommendations: [],
        executiveSummary: {
          title: 'Test Summary',
          overview: 'Test overview',
          keyFindings: [],
          topPriorities: [],
          estimatedImpact: {},
          nextSteps: [],
        },
      };

      const html = ReportGenerator.generateHTML(mockReport);

      expect(typeof html).toBe('string');
      expect(html.includes('<!DOCTYPE html>')).toBe(true);
      expect(html.includes('Performance Audit Report')).toBe(true);
    });
  });

  // ========================================================================
  // Performance Auditor Integration Tests
  // ========================================================================
  describe('PerformanceAuditor', () => {
    it('should initialize successfully', () => {
      const auditor = new PerformanceAuditor(projectRoot);
      expect(auditor).toBeDefined();
    });

    it('should check audit status', async () => {
      const auditor = new PerformanceAuditor(projectRoot);
      const status = await auditor.getStatus();

      expect(status).toBeDefined();
      expect(status.ready).toBeDefined();
      expect(status.message).toBeDefined();
    });

    it('should run complete audit', async () => {
      const auditor = new PerformanceAuditor(projectRoot);
      const report = await auditor.runAudit();

      expect(report).toBeDefined();
      expect(report.timestamp).toBeDefined();
      expect(report.overallScore).toBeGreaterThanOrEqual(0);
      expect(report.overallScore).toBeLessThanOrEqual(100);
      expect(Array.isArray(report.recommendations)).toBe(true);
    });
  });
});
