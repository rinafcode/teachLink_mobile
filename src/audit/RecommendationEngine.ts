/**
 * Recommendation Engine
 * Generates prioritized recommendations based on audit analysis
 */

import type {
  PerformanceAuditReport,
  Recommendation,
  RecommendationCategory,
  SeverityLevel,
} from './types';

export class RecommendationEngine {
  /**
   * Generate recommendations from a complete audit report
   */
  static generateRecommendations(report: PerformanceAuditReport): Recommendation[] {
    const recommendations: Recommendation[] = [];

    // Bundle recommendations
    if (report.bundleAnalysis.totalSize > 5000000) {
      recommendations.push(this.createBundleOptimizationRec('Critical bundle size'));
    }

    if (report.bundleAnalysis.largeFiles.length > 0) {
      recommendations.push(this.createLargeFilesRec(report.bundleAnalysis.largeFiles));
    }

    if (report.bundleAnalysis.duplicateModules.length > 0) {
      recommendations.push(this.createDuplicateModulesRec(report.bundleAnalysis.duplicateModules));
    }

    // Memory recommendations
    if (report.memoryAnalysis.estimatedMemoryLeaks.length > 0) {
      recommendations.push(
        this.createMemoryLeakRec(report.memoryAnalysis.estimatedMemoryLeaks.length)
      );
    }

    if (report.memoryAnalysis.largeObjects.length > 0) {
      recommendations.push(this.createLargeObjectsRec(report.memoryAnalysis.largeObjects));
    }

    // Render recommendations
    if (report.renderAnalysis.slowComponents.length > 0) {
      recommendations.push(this.createSlowComponentsRec(report.renderAnalysis.slowComponents));
    }

    if (report.renderAnalysis.rerenderIssues.length > 0) {
      recommendations.push(this.createRerenderRec(report.renderAnalysis.rerenderIssues));
    }

    // Network recommendations
    if (report.networkAnalysis.slowEndpoints.length > 0) {
      recommendations.push(this.createNetworkOptimizationRec(report.networkAnalysis.slowEndpoints));
    }

    if (report.networkAnalysis.redundantRequests.length > 0) {
      recommendations.push(
        this.createDeduplicationRec(report.networkAnalysis.redundantRequests.length)
      );
    }

    if (report.networkAnalysis.unoptimizedAssets.length > 0) {
      recommendations.push(
        this.createAssetOptimizationRec(report.networkAnalysis.unoptimizedAssets)
      );
    }

    // Dependency recommendations
    if (report.dependencyAnalysis.vulnerabilities.length > 0) {
      recommendations.push(this.createSecurityUpdateRec(report.dependencyAnalysis.vulnerabilities));
    }

    if (report.dependencyAnalysis.outdatedDependencies.length > 0) {
      recommendations.push(
        this.createDependencyUpdateRec(report.dependencyAnalysis.outdatedDependencies.length)
      );
    }

    if (report.dependencyAnalysis.unusedDependencies.length > 0) {
      recommendations.push(
        this.createRemoveUnusedRec(report.dependencyAnalysis.unusedDependencies.length)
      );
    }

    // Asset recommendations
    if (report.assetAnalysis.images.formatOpportunities.length > 0) {
      recommendations.push(
        this.createImageFormatRec(report.assetAnalysis.images.formatOpportunities)
      );
    }

    if (report.assetAnalysis.images.unusedImages.length > 0) {
      recommendations.push(
        this.createUnusedAssetsRec(report.assetAnalysis.images.unusedImages.length)
      );
    }

    // Runtime recommendations
    if (report.runtimeAnalysis.startupTime > 2000) {
      recommendations.push(this.createStartupOptimizationRec(report.runtimeAnalysis.startupTime));
    }

    // Sort by priority
    return recommendations.sort((a, b) => b.priority - a.priority);
  }

  // ========================================================================
  // BUNDLE RECOMMENDATIONS
  // ========================================================================

  private static createBundleOptimizationRec(message: string): Recommendation {
    return {
      id: 'bundle-001',
      title: 'Optimize Bundle Size',
      description: message,
      severity: 'HIGH' as SeverityLevel,
      category: 'bundle-size' as RecommendationCategory,
      impact: 'Reduce initial load time and memory usage',
      effort: 'MEDIUM',
      estimatedSavings: { bundleSize: 500000 },
      implementation: `
1. Analyze bundle with "npm run analyze"
2. Identify unused code with tree-shaking
3. Lazy load non-critical routes
4. Remove unused dependencies
5. Use dynamic imports for heavy modules
      `.trim(),
      references: ['https://webpack.js.org/guides/code-splitting/'],
      priority: 85,
    };
  }

  private static createLargeFilesRec(files: any[]): Recommendation {
    const topFile = files[0];
    return {
      id: 'bundle-002',
      title: `Break Down Large File: ${topFile.module}`,
      description: `File "${topFile.path}" is ${(topFile.size / 1000).toFixed(0)}KB - consider splitting`,
      severity: 'MEDIUM' as SeverityLevel,
      category: 'bundle-size' as RecommendationCategory,
      impact: 'Improve code maintainability and reduce initial parse time',
      effort: 'MEDIUM',
      estimatedSavings: { bundleSize: topFile.size * 0.2 },
      implementation: `
1. Identify logical sections in the file
2. Create separate component files
3. Use proper module exports
4. Update imports in parent components
5. Test thoroughly after refactoring
      `.trim(),
      references: ['https://react.dev/reference/react/lazy'],
      priority: 70,
    };
  }

  private static createDuplicateModulesRec(duplicates: any[]): Recommendation {
    const topDuplicate = duplicates[0];
    return {
      id: 'bundle-003',
      title: `Resolve Duplicate Dependency: ${topDuplicate.name}`,
      description: `Found ${topDuplicate.count} versions of ${topDuplicate.name} using ${(topDuplicate.totalSize / 1000).toFixed(0)}KB`,
      severity: 'HIGH' as SeverityLevel,
      category: 'bundle-size' as RecommendationCategory,
      impact: `Save ${(topDuplicate.totalSize / 1000).toFixed(0)}KB and improve performance`,
      effort: 'MEDIUM',
      estimatedSavings: { bundleSize: topDuplicate.totalSize },
      implementation: `
1. Run "npm ls ${topDuplicate.name}" to find duplication sources
2. Update package.json to use consistent versions
3. Use npm resolutions field if needed
4. Clear cache and reinstall: npm ci
5. Verify bundle size reduced
      `.trim(),
      references: ['https://docs.npmjs.com/cli/v8/configuring-npm/package-json#overrides'],
      priority: 90,
    };
  }

  // ========================================================================
  // MEMORY RECOMMENDATIONS
  // ========================================================================

  private static createMemoryLeakRec(count: number): Recommendation {
    return {
      id: 'memory-001',
      title: `Fix ${count} Potential Memory Leaks`,
      description: `Detected ${count} potential memory leak patterns in hooks`,
      severity: 'HIGH' as SeverityLevel,
      category: 'memory-management' as RecommendationCategory,
      impact: 'Prevent app from accumulating memory over time',
      effort: 'MEDIUM',
      estimatedSavings: { memory: 50000000 },
      implementation: `
1. Always return cleanup functions from useEffect
2. Unsubscribe from observables in cleanup
3. Remove event listeners in cleanup
4. Clear timers in cleanup
5. Use React DevTools Profiler to verify
      `.trim(),
      references: ['https://react.dev/learn/synchronizing-with-effects#cleanup-function'],
      priority: 92,
    };
  }

  private static createLargeObjectsRec(objects: any[]): Recommendation {
    return {
      id: 'memory-002',
      title: 'Optimize Large Data Objects',
      description: `Found ${objects.length} large data objects that could be optimized`,
      severity: 'MEDIUM' as SeverityLevel,
      category: 'memory-management' as RecommendationCategory,
      impact: 'Reduce peak memory usage and improve GC efficiency',
      effort: 'MEDIUM',
      estimatedSavings: { memory: objects.reduce((s: number, o: any) => s + o.size, 0) * 0.3 },
      implementation: `
1. Move data to file system or database
2. Implement lazy loading for large datasets
3. Paginate lists instead of loading all at once
4. Use WeakMap for object caches
5. Profile memory usage with DevTools
      `.trim(),
      references: ['https://nodejs.org/en/docs/guides/nodejs-performance-tracking/'],
      priority: 72,
    };
  }

  // ========================================================================
  // RENDER RECOMMENDATIONS
  // ========================================================================

  private static createSlowComponentsRec(components: any[]): Recommendation {
    return {
      id: 'render-001',
      title: `Optimize ${components.length} Slow Components`,
      description: `Components are rendering slowly: ${components
        .slice(0, 3)
        .map((c: any) => c.name)
        .join(', ')}`,
      severity: 'MEDIUM' as SeverityLevel,
      category: 'rendering-performance' as RecommendationCategory,
      impact: 'Improve frame rate and user experience',
      effort: 'MEDIUM',
      estimatedSavings: { renderTime: 1000 },
      implementation: `
1. Wrap components with React.memo
2. Use useMemo for expensive computations
3. Use useCallback for event handlers
4. Profile with React DevTools Profiler
5. Consider using virtualization for lists
      `.trim(),
      references: ['https://react.dev/reference/react/useMemo'],
      priority: 75,
    };
  }

  private static createRerenderRec(issues: any[]): Recommendation {
    return {
      id: 'render-002',
      title: `Prevent ${issues.length} Unnecessary Re-renders`,
      description: 'Components are re-rendering unnecessarily due to prop changes',
      severity: 'MEDIUM' as SeverityLevel,
      category: 'rendering-performance' as RecommendationCategory,
      impact: 'Reduce CPU usage and improve responsiveness',
      effort: 'MEDIUM',
      estimatedSavings: { renderTime: 500 },
      implementation: `
1. Move state to context if it's causing cascading updates
2. Use useCallback for stable function references
3. Split state into smaller pieces
4. Consider using Zustand or similar state manager
5. Profile to identify the cause of re-renders
      `.trim(),
      references: ['https://react.dev/reference/react/useCallback'],
      priority: 68,
    };
  }

  // ========================================================================
  // NETWORK RECOMMENDATIONS
  // ========================================================================

  private static createNetworkOptimizationRec(endpoints: any[]): Recommendation {
    const slowest = endpoints[0];
    return {
      id: 'network-001',
      title: 'Optimize Slow API Endpoints',
      description: `${slowest.url} averages ${slowest.avgLatency.toFixed(0)}ms latency`,
      severity: 'MEDIUM' as SeverityLevel,
      category: 'network-optimization' as RecommendationCategory,
      impact: 'Reduce perceived latency and improve user experience',
      effort: 'HIGH',
      estimatedSavings: { latency: 500 },
      implementation: `
1. Profile server-side query performance
2. Add database indexes
3. Implement caching (Redis, CDN)
4. Use GraphQL to fetch only needed fields
5. Implement pagination for large responses
6. Monitor with performance.now() on client
      `.trim(),
      references: ['https://web.dev/performance/'],
      priority: 70,
    };
  }

  private static createDeduplicationRec(count: number): Recommendation {
    return {
      id: 'network-002',
      title: `Implement Request Deduplication (${count} redundant)`,
      description: `Detected ${count} redundant API requests being made`,
      severity: 'MEDIUM' as SeverityLevel,
      category: 'network-optimization' as RecommendationCategory,
      impact: `Reduce data usage and improve latency by ${count * 30}ms average`,
      effort: 'MEDIUM',
      estimatedSavings: { latency: count * 30 },
      implementation: `
1. Use React Query or SWR for caching
2. Implement request deduplication in service layer
3. Use etags for conditional requests
4. Implement local storage caching
5. Add request retry logic with exponential backoff
      `.trim(),
      references: ['https://tanstack.com/query/latest'],
      priority: 73,
    };
  }

  private static createAssetOptimizationRec(assets: any[]): Recommendation {
    const totalSavings = assets.reduce((s: number, a: any) => s + a.savings, 0);
    return {
      id: 'network-003',
      title: `Optimize ${assets.length} Unoptimized Assets`,
      description: `Could save ~${(totalSavings / 1000).toFixed(0)}KB through asset optimization`,
      severity: 'MEDIUM' as SeverityLevel,
      category: 'asset-optimization' as RecommendationCategory,
      impact: `Reduce data transfer by ${(totalSavings / 1000).toFixed(0)}KB`,
      effort: 'LOW',
      estimatedSavings: { bundleSize: totalSavings },
      implementation: `
1. Convert images to WebP format
2. Use responsive image optimization
3. Compress with tinypng or ImageOptim
4. Remove unused assets
5. Use CDN with auto-optimization
      `.trim(),
      references: ['https://web.dev/optimize-images/'],
      priority: 65,
    };
  }

  // ========================================================================
  // DEPENDENCY RECOMMENDATIONS
  // ========================================================================

  private static createSecurityUpdateRec(vulns: any[]): Recommendation {
    const critical = vulns.filter((v: any) => v.severity === 'CRITICAL').length;
    return {
      id: 'deps-001',
      title: `Fix ${vulns.length} Security Vulnerabilities`,
      description: `Found ${critical} critical, ${vulns.length - critical} other vulnerabilities`,
      severity: critical > 0 ? ('CRITICAL' as SeverityLevel) : ('HIGH' as SeverityLevel),
      category: 'dependency-management' as RecommendationCategory,
      impact: 'Prevent security breaches and data leaks',
      effort: 'MEDIUM',
      implementation: `
1. Run npm audit
2. Update affected packages
3. Test thoroughly after updates
4. Monitor npm security advisories
5. Use Dependabot or Snyk for automation
      `.trim(),
      references: ['https://docs.npmjs.com/cli/v8/commands/npm-audit'],
      priority: 98,
    };
  }

  private static createDependencyUpdateRec(count: number): Recommendation {
    return {
      id: 'deps-002',
      title: `Update ${count} Outdated Dependencies`,
      description: `${count} dependencies are behind on updates`,
      severity: 'LOW' as SeverityLevel,
      category: 'dependency-management' as RecommendationCategory,
      impact: 'Get security patches and performance improvements',
      effort: 'MEDIUM',
      implementation: `
1. Run npm outdated to see available updates
2. Review breaking changes in release notes
3. Update dependencies incrementally
4. Run full test suite after updates
5. Monitor for regressions in production
      `.trim(),
      references: ['https://docs.npmjs.com/cli/v8/commands/npm-update'],
      priority: 55,
    };
  }

  private static createRemoveUnusedRec(count: number): Recommendation {
    return {
      id: 'deps-003',
      title: `Remove ${count} Unused Dependencies`,
      description: `Identified ${count} dependencies that aren't used`,
      severity: 'LOW' as SeverityLevel,
      category: 'dependency-management' as RecommendationCategory,
      impact: 'Reduce bundle size and maintenance burden',
      effort: 'LOW',
      implementation: `
1. Use depcheck to find unused deps
2. Verify they're truly not used
3. Run npm uninstall package-name
4. Test to ensure nothing breaks
5. Commit changes
      `.trim(),
      references: ['https://www.npmjs.com/package/depcheck'],
      priority: 45,
    };
  }

  // ========================================================================
  // ASSET RECOMMENDATIONS
  // ========================================================================

  private static createImageFormatRec(opportunities: any[]): Recommendation {
    const totalSavings = opportunities.reduce((s: number, o: any) => s + o.potentialSavings, 0);
    return {
      id: 'assets-001',
      title: `Convert ${opportunities.length} Images to WebP`,
      description: `Could save ~${(totalSavings / 1000).toFixed(0)}KB with modern image formats`,
      severity: 'LOW' as SeverityLevel,
      category: 'asset-optimization' as RecommendationCategory,
      impact: `Save ${(totalSavings / 1000).toFixed(0)}KB and improve loading speed`,
      effort: 'LOW',
      estimatedSavings: { bundleSize: totalSavings },
      implementation: `
1. Use Squoosh or ImageMagick to convert
2. Keep originals as fallback
3. Use picture element for responsive loading
4. Test on all target devices
5. Update asset references
      `.trim(),
      references: ['https://web.dev/use-webp-images/'],
      priority: 50,
    };
  }

  private static createUnusedAssetsRec(count: number): Recommendation {
    return {
      id: 'assets-002',
      title: `Remove ${count} Unused Assets`,
      description: `Found ${count} assets that aren't referenced in code`,
      severity: 'LOW' as SeverityLevel,
      category: 'asset-optimization' as RecommendationCategory,
      impact: 'Reduce project size and deployment time',
      effort: 'LOW',
      implementation: `
1. Identify unused assets with bundler analysis
2. Search codebase to confirm they're unused
3. Delete from assets directory
4. Check git history if needed in future
5. Update any build configurations
      `.trim(),
      references: ['https://webpack.js.org/plugins/terser-webpack-plugin/'],
      priority: 40,
    };
  }

  // ========================================================================
  // RUNTIME RECOMMENDATIONS
  // ========================================================================

  private static createStartupOptimizationRec(startupTime: number): Recommendation {
    return {
      id: 'runtime-001',
      title: `Optimize App Startup Time (${startupTime.toFixed(0)}ms)`,
      description: `App startup takes ${startupTime.toFixed(0)}ms, target is <1000ms`,
      severity: 'MEDIUM' as SeverityLevel,
      category: 'runtime-performance' as RecommendationCategory,
      impact: 'Improve first user impression and perceived performance',
      effort: 'HIGH',
      estimatedSavings: { renderTime: startupTime * 0.3 },
      implementation: `
1. Lazy load non-essential modules
2. Use code splitting for routes
3. Defer non-critical initializations
4. Profile with React Profiler
5. Reduce main thread work
6. Use Service Workers for caching
      `.trim(),
      references: ['https://web.dev/performance-auditing/'],
      priority: 80,
    };
  }
}
