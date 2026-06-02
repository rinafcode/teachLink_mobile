/**
 * Performance Audit Orchestrator
 * Main class that coordinates all analyzers and generates comprehensive report
 */

import { BundleAnalyzer } from './analyzers/BundleAnalyzer';
import { MemoryAnalyzer, RenderAnalyzer } from './analyzers/MemoryAnalyzer';
import { DependencyAnalyzer, NetworkAnalyzer } from './analyzers/NetworkAnalyzer';
import { AssetAnalyzer, RuntimeAnalyzer } from './analyzers/RuntimeAnalyzer';
import { RecommendationEngine } from './RecommendationEngine';
import { ReportGenerator } from './ReportGenerator';
import type { AuditOptions, ExecutiveSummary, PerformanceAuditReport } from './types';

export class PerformanceAuditor {
  private projectRoot: string;
  private options: Required<AuditOptions>;

  constructor(projectRoot: string = process.cwd(), options: AuditOptions = {}) {
    this.projectRoot = projectRoot;
    this.options = {
      verbose: options.verbose ?? true,
      format: options.format ?? 'json',
      outputPath: options.outputPath ?? 'audit-report',
      analyzeSourceMap: options.analyzeSourceMap ?? false,
      includeLicenseAudit: options.includeLicenseAudit ?? true,
      compareWithBaseline: options.compareWithBaseline ?? false,
      baselineFile: options.baselineFile ?? 'audit-baseline.json',
      customThresholds: options.customThresholds ?? {},
    };
  }

  /**
   * Run complete audit
   */
  async runAudit(): Promise<PerformanceAuditReport> {
    const startTime = Date.now();

    if (this.options.verbose) {
      console.log('🔍 Starting comprehensive performance audit...\n');
    }

    try {
      // Run all analyzers in parallel
      if (this.options.verbose) console.log('📦 Analyzing bundle...');
      const bundleAnalysis = await new BundleAnalyzer(this.projectRoot).analyze();

      if (this.options.verbose) console.log('💾 Analyzing memory...');
      const memoryAnalysis = await new MemoryAnalyzer(this.projectRoot).analyze();

      if (this.options.verbose) console.log('⚡ Analyzing render performance...');
      const renderAnalysis = await new RenderAnalyzer(this.projectRoot).analyze();

      if (this.options.verbose) console.log('🌐 Analyzing network...');
      const networkAnalysis = await new NetworkAnalyzer(this.projectRoot).analyze();

      if (this.options.verbose) console.log('📚 Analyzing dependencies...');
      const dependencyAnalysis = await new DependencyAnalyzer(this.projectRoot).analyze();

      if (this.options.verbose) console.log('🚀 Analyzing runtime...');
      const runtimeAnalysis = await new RuntimeAnalyzer(this.projectRoot).analyze();

      if (this.options.verbose) console.log('🖼️ Analyzing assets...');
      const assetAnalysis = await new AssetAnalyzer(this.projectRoot).analyze();

      if (this.options.verbose) console.log('🎯 Generating recommendations...');
      const recommendations = RecommendationEngine.generateRecommendations({
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        duration: Date.now() - startTime,
        overallScore: 75, // Placeholder, will be calculated
        trend: 'stable',
        bundleAnalysis,
        memoryAnalysis,
        renderAnalysis,
        networkAnalysis,
        dependencyAnalysis,
        runtimeAnalysis,
        assetAnalysis,
        recommendations: [],
        executiveSummary: this.generateDefaultSummary(),
      });

      // Build final report
      const report = this.buildReport(
        bundleAnalysis,
        memoryAnalysis,
        renderAnalysis,
        networkAnalysis,
        dependencyAnalysis,
        runtimeAnalysis,
        assetAnalysis,
        recommendations,
        Date.now() - startTime
      );

      if (this.options.verbose) {
        console.log('\n✅ Audit complete!\n');
        console.log(`📊 Overall Score: ${report.overallScore}/100`);
        console.log(`🎯 Recommendations: ${report.recommendations.length}`);
      }

      return report;
    } catch (error) {
      console.error('❌ Audit failed:', error);
      throw error;
    }
  }

  /**
   * Run audit and generate reports
   */
  async auditAndReport(formats?: ('json' | 'html' | 'markdown')[]): Promise<string[]> {
    const report = await this.runAudit();
    const targetFormats =
      formats ||
      (this.options.format === 'all'
        ? ['json', 'html', 'markdown']
        : [this.options.format as 'json' | 'html' | 'markdown']);

    const files: string[] = [];

    for (const format of targetFormats) {
      const fileName = `${this.options.outputPath}.${format === 'markdown' ? 'md' : format}`;
      const filePath = ReportGenerator.saveReport(report, format, fileName);
      files.push(filePath);

      if (this.options.verbose) {
        console.log(`📄 Report saved: ${filePath}`);
      }
    }

    return files;
  }

  /**
   * Build complete report
   */
  private buildReport(
    bundleAnalysis: any,
    memoryAnalysis: any,
    renderAnalysis: any,
    networkAnalysis: any,
    dependencyAnalysis: any,
    runtimeAnalysis: any,
    assetAnalysis: any,
    recommendations: any[],
    duration: number
  ): PerformanceAuditReport {
    const score = this.calculateOverallScore(
      bundleAnalysis,
      memoryAnalysis,
      renderAnalysis,
      networkAnalysis,
      dependencyAnalysis,
      runtimeAnalysis,
      assetAnalysis,
      recommendations
    );

    const summary = this.generateExecutiveSummary(
      score,
      bundleAnalysis,
      memoryAnalysis,
      renderAnalysis,
      networkAnalysis,
      dependencyAnalysis,
      runtimeAnalysis,
      recommendations
    );

    return {
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      duration,
      overallScore: score,
      trend: 'stable',
      bundleAnalysis,
      memoryAnalysis,
      renderAnalysis,
      networkAnalysis,
      dependencyAnalysis,
      runtimeAnalysis,
      assetAnalysis,
      recommendations: recommendations.sort((a, b) => b.priority - a.priority),
      executiveSummary: summary,
    };
  }

  /**
   * Calculate overall performance score
   */
  private calculateOverallScore(
    bundleAnalysis: any,
    memoryAnalysis: any,
    renderAnalysis: any,
    networkAnalysis: any,
    dependencyAnalysis: any,
    runtimeAnalysis: any,
    assetAnalysis: any,
    recommendations: any[]
  ): number {
    let score = 100;

    // Bundle score
    if (bundleAnalysis.totalSize > 5000000) score -= 20; // 5MB threshold
    if (bundleAnalysis.totalSize > 3000000) score -= 10;
    if (bundleAnalysis.duplicateModules.length > 2) score -= 5;

    // Memory score
    if (memoryAnalysis.estimatedMemoryLeaks.length > 0) score -= 15;
    if (memoryAnalysis.largeObjects.length > 5) score -= 5;

    // Render score
    if (renderAnalysis.avgRenderTime > 50) score -= 10;
    if (renderAnalysis.slowComponents.length > 3) score -= 5;

    // Network score
    if (networkAnalysis.slowEndpoints.length > 3) score -= 8;
    if (networkAnalysis.averageLatency > 400) score -= 5;

    // Dependency score
    if (dependencyAnalysis.vulnerabilities.length > 0) score -= 20;
    if (dependencyAnalysis.outdatedDependencies.length > 5) score -= 5;

    // Runtime score
    if (runtimeAnalysis.startupTime > 2000) score -= 10;

    // Asset score
    if (assetAnalysis.totalAssetSize > 10000000) score -= 5;

    // Recommendation score
    const criticalRecs = recommendations.filter((r: any) => r.severity === 'CRITICAL').length;
    const highRecs = recommendations.filter((r: any) => r.severity === 'HIGH').length;
    score -= criticalRecs * 5;
    score -= highRecs * 2;

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Generate executive summary
   */
  private generateExecutiveSummary(
    score: number,
    bundleAnalysis: any,
    memoryAnalysis: any,
    renderAnalysis: any,
    networkAnalysis: any,
    dependencyAnalysis: any,
    runtimeAnalysis: any,
    recommendations: any[]
  ): ExecutiveSummary {
    const keyFindings: string[] = [];
    const topPriorities: string[] = [];

    // Key findings
    keyFindings.push(`Bundle size: ${(bundleAnalysis.totalSize / 1000).toFixed(0)}KB`);
    if (bundleAnalysis.duplicateModules.length > 0) {
      keyFindings.push(`Found ${bundleAnalysis.duplicateModules.length} duplicate modules`);
    }
    if (memoryAnalysis.estimatedMemoryLeaks.length > 0) {
      keyFindings.push(
        `${memoryAnalysis.estimatedMemoryLeaks.length} potential memory leaks detected`
      );
    }
    if (renderAnalysis.slowComponents.length > 0) {
      keyFindings.push(`${renderAnalysis.slowComponents.length} slow rendering components`);
    }
    if (networkAnalysis.slowEndpoints.length > 0) {
      keyFindings.push(`${networkAnalysis.slowEndpoints.length} slow API endpoints`);
    }

    // Top priorities
    const critical = recommendations.filter((r: any) => r.severity === 'CRITICAL');
    const high = recommendations.filter((r: any) => r.severity === 'HIGH');

    if (critical.length > 0) {
      topPriorities.push(critical[0].title);
    }
    if (high.length > 0) {
      topPriorities.push(high[0].title);
    }
    if (memoryAnalysis.estimatedMemoryLeaks.length > 0) {
      topPriorities.push('Fix memory leaks in hooks and event listeners');
    }
    if (bundleAnalysis.duplicateModules.length > 0) {
      topPriorities.push(`Resolve ${bundleAnalysis.duplicateModules[0].name} duplication`);
    }

    return {
      title: 'Performance Audit Executive Summary',
      overview: `This comprehensive performance audit analyzed your application across 7 major dimensions: bundle size, memory management, render performance, network optimization, dependency management, runtime performance, and asset optimization. Your application currently scores ${score}/100.`,
      keyFindings,
      topPriorities,
      estimatedImpact: {
        bundleReduction: `${Math.round((bundleAnalysis.totalSize * 0.15) / 1000)}KB`,
        performanceGain: `${Math.round(runtimeAnalysis.startupTime * 0.2)}ms`,
        memoryImprovement: `${Math.round((memoryAnalysis.heapUsed * 0.1) / 1000000)}MB`,
        networkOptimization: `${Math.round(networkAnalysis.averageLatency * 0.2)}ms`,
      },
      nextSteps: [
        'Review critical recommendations',
        'Prioritize fixes by impact and effort',
        'Implement changes in sprints',
        'Re-run audit quarterly to track progress',
        'Monitor metrics in production',
      ],
    };
  }

  /**
   * Generate default summary
   */
  private generateDefaultSummary(): ExecutiveSummary {
    return {
      title: 'Performance Audit Summary',
      overview: 'Comprehensive performance audit of the application.',
      keyFindings: [],
      topPriorities: [],
      estimatedImpact: {},
      nextSteps: [],
    };
  }

  /**
   * Get audit status
   */
  async getStatus(): Promise<{ ready: boolean; message: string }> {
    try {
      const bundleAnalyzer = new BundleAnalyzer(this.projectRoot);
      const isValid = await bundleAnalyzer.validate();

      return {
        ready: isValid,
        message: isValid
          ? 'Project is ready for audit'
          : 'Project may have issues - audit may be incomplete',
      };
    } catch (error) {
      return {
        ready: false,
        message: `Error checking project status: ${error}`,
      };
    }
  }
}

// Export for easy importing
export { RecommendationEngine, ReportGenerator };
export type { AuditOptions, PerformanceAuditReport };
