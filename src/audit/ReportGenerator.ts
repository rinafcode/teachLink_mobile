/**
 * Report Generator
 * Generates audit reports in multiple formats (JSON, HTML, Markdown)
 */

import * as fs from 'fs';
import * as path from 'path';

import type { ExecutiveSummary, PerformanceAuditReport, Recommendation } from './types';

export class ReportGenerator {
  /**
   * Generate JSON report
   */
  static generateJSON(report: PerformanceAuditReport): string {
    return JSON.stringify(report, null, 2);
  }

  /**
   * Generate Markdown report
   */
  static generateMarkdown(report: PerformanceAuditReport): string {
    const date = new Date(report.timestamp).toLocaleDateString();
    const time = new Date(report.timestamp).toLocaleTimeString();

    let md = `# Performance Audit Report\n\n`;
    md += `**Generated:** ${date} at ${time}\n`;
    md += `**Environment:** ${report.environment}\n`;
    md += `**Duration:** ${report.duration}ms\n\n`;

    // Overall Score
    md += this.generateScoreSection(report);

    // Executive Summary
    md += this.generateExecutiveSummary(report.executiveSummary);

    // Key Findings
    md += this.generateKeyFindings(report);

    // Detailed Analysis
    md += this.generateBundleSection(report);
    md += this.generateMemorySection(report);
    md += this.generateRenderSection(report);
    md += this.generateNetworkSection(report);
    md += this.generateDependencySection(report);
    md += this.generateRuntimeSection(report);
    md += this.generateAssetSection(report);

    // Recommendations
    md += this.generateRecommendationsSection(report.recommendations);

    return md;
  }

  /**
   * Generate HTML report
   */
  static generateHTML(report: PerformanceAuditReport): string {
    const date = new Date(report.timestamp).toLocaleDateString();
    const recommendations = report.recommendations;
    const criticalCount = recommendations.filter(r => r.severity === 'CRITICAL').length;
    const highCount = recommendations.filter(r => r.severity === 'HIGH').length;

    let html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Performance Audit Report</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
            background: #f5f5f5;
            color: #333;
            line-height: 1.6;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }
        
        header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 40px 20px;
            border-radius: 8px;
            margin-bottom: 30px;
        }
        
        header h1 {
            font-size: 2.5em;
            margin-bottom: 10px;
        }
        
        .score-card {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin: 30px 0;
        }
        
        .card {
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            border-left: 5px solid #667eea;
        }
        
        .card h3 {
            font-size: 1.2em;
            margin-bottom: 10px;
            color: #333;
        }
        
        .card .value {
            font-size: 2em;
            font-weight: bold;
            color: #667eea;
            margin: 10px 0;
        }
        
        .card.critical { border-left-color: #e74c3c; }
        .card.high { border-left-color: #f39c12; }
        .card.medium { border-left-color: #f1c40f; }
        .card.low { border-left-color: #2ecc71; }
        
        .severity-badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 0.85em;
            font-weight: 600;
            margin: 0 5px 5px 0;
        }
        
        .severity-badge.critical { background: #e74c3c; color: white; }
        .severity-badge.high { background: #f39c12; color: white; }
        .severity-badge.medium { background: #f1c40f; color: #333; }
        .severity-badge.low { background: #2ecc71; color: white; }
        .severity-badge.info { background: #3498db; color: white; }
        
        .section {
            background: white;
            padding: 30px;
            margin: 20px 0;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        
        .section h2 {
            color: #667eea;
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 2px solid #f0f0f0;
        }
        
        .section h3 {
            color: #555;
            margin-top: 15px;
            margin-bottom: 10px;
        }
        
        .metric {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
            margin-bottom: 10px;
        }
        
        .metric-item {
            padding: 10px;
            background: #f9f9f9;
            border-radius: 4px;
        }
        
        .metric-label {
            color: #666;
            font-size: 0.9em;
        }
        
        .metric-value {
            font-size: 1.2em;
            font-weight: bold;
            color: #333;
        }
        
        .recommendations {
            margin-top: 20px;
        }
        
        .recommendation-item {
            background: #f9f9f9;
            padding: 15px;
            margin-bottom: 15px;
            border-radius: 4px;
            border-left: 4px solid #667eea;
        }
        
        .recommendation-item h4 {
            margin-bottom: 10px;
        }
        
        .recommendation-item .effort {
            display: inline-block;
            padding: 4px 8px;
            background: #e8e8e8;
            border-radius: 3px;
            font-size: 0.85em;
            margin-top: 10px;
        }
        
        .progress-bar {
            height: 8px;
            background: #e8e8e8;
            border-radius: 4px;
            overflow: hidden;
            margin: 10px 0;
        }
        
        .progress-fill {
            height: 100%;
            background: #667eea;
            transition: width 0.3s ease;
        }
        
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 15px 0;
        }
        
        table th, table td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #e8e8e8;
        }
        
        table th {
            background: #f5f5f5;
            font-weight: 600;
        }
        
        .footer {
            text-align: center;
            color: #999;
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e8e8e8;
        }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>📊 Performance Audit Report</h1>
            <p>teachLink Mobile - Comprehensive Performance Analysis</p>
            <p>Generated: ${date}</p>
        </header>
        
        <div class="score-card">
            <div class="card">
                <h3>Overall Score</h3>
                <div class="value">${report.overallScore}/100</div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${report.overallScore}%"></div>
                </div>
            </div>
            
            <div class="card critical">
                <h3>Critical Issues</h3>
                <div class="value">${criticalCount}</div>
            </div>
            
            <div class="card high">
                <h3>High Priority</h3>
                <div class="value">${highCount}</div>
            </div>
            
            <div class="card">
                <h3>Total Recommendations</h3>
                <div class="value">${recommendations.length}</div>
            </div>
        </div>
        
        <div class="section">
            <h2>Executive Summary</h2>
            <p>${report.executiveSummary.overview}</p>
            
            <h3>Key Findings</h3>
            <ul>
                ${report.executiveSummary.keyFindings.map(f => `<li>${f}</li>`).join('\n                ')}
            </ul>
            
            <h3>Top Priorities</h3>
            <ul>
                ${report.executiveSummary.topPriorities.map(p => `<li>${p}</li>`).join('\n                ')}
            </ul>
            
            <h3>Estimated Impact</h3>
            <div class="metric">
                <div class="metric-item">
                    <div class="metric-label">Bundle Reduction</div>
                    <div class="metric-value">${report.executiveSummary.estimatedImpact.bundleReduction || 'TBD'}</div>
                </div>
                <div class="metric-item">
                    <div class="metric-label">Performance Gain</div>
                    <div class="metric-value">${report.executiveSummary.estimatedImpact.performanceGain || 'TBD'}</div>
                </div>
            </div>
        </div>
        
        ${this.generateHTMLBundle(report)}
        ${this.generateHTMLMemory(report)}
        ${this.generateHTMLRender(report)}
        ${this.generateHTMLNetwork(report)}
        ${this.generateHTMLDependencies(report)}
        ${this.generateHTMLAssets(report)}
        ${this.generateHTMLRecommendations(report.recommendations)}
        
        <div class="footer">
            <p>This audit was automatically generated by the Performance Audit System.</p>
            <p>Review and prioritize recommendations based on your project's specific needs.</p>
        </div>
    </div>
</body>
</html>`;

    return html;
  }

  // ========================================================================
  // MARKDOWN SECTIONS
  // ========================================================================

  private static generateScoreSection(report: PerformanceAuditReport): string {
    const trend = report.trend === 'improving' ? '📈' : report.trend === 'degrading' ? '📉' : '➡️';
    const change = report.previousScore ? report.overallScore - report.previousScore : 0;
    const changeStr = change > 0 ? `+${change}` : change < 0 ? `${change}` : 'No change';

    return `## Overall Performance Score\n\n**${report.overallScore}/100** ${trend} (${changeStr})\n\n`;
  }

  private static generateExecutiveSummary(summary: ExecutiveSummary): string {
    let md = `## Executive Summary\n\n`;
    md += `${summary.overview}\n\n`;

    md += `### Key Findings\n`;
    for (const finding of summary.keyFindings) {
      md += `- ${finding}\n`;
    }
    md += '\n';

    md += `### Top Priorities\n`;
    for (const priority of summary.topPriorities) {
      md += `- ${priority}\n`;
    }
    md += '\n';

    return md;
  }

  private static generateKeyFindings(report: PerformanceAuditReport): string {
    let md = `## Key Metrics\n\n`;
    md += `| Metric | Value |\n`;
    md += `|--------|-------|\n`;
    md += `| Bundle Size | ${(report.bundleAnalysis.totalSize / 1000).toFixed(0)}KB |\n`;
    md += `| Gzip Size | ${(report.bundleAnalysis.gzipSize / 1000).toFixed(0)}KB |\n`;
    md += `| Total Requests | ${report.networkAnalysis.totalRequests} |\n`;
    md += `| Avg Latency | ${report.networkAnalysis.averageLatency}ms |\n`;
    md += `| Startup Time | ${report.runtimeAnalysis.startupTime.toFixed(0)}ms |\n`;
    md += `| Dependencies | ${report.dependencyAnalysis.totalDependencies} |\n\n`;
    return md;
  }

  private static generateBundleSection(report: PerformanceAuditReport): string {
    const { bundleAnalysis } = report;
    let md = `## Bundle Analysis\n\n`;
    md += `**Total Size:** ${(bundleAnalysis.totalSize / 1000).toFixed(0)}KB (${(bundleAnalysis.gzipSize / 1000).toFixed(0)}KB gzipped)\n\n`;

    if (bundleAnalysis.largeFiles.length > 0) {
      md += `### Largest Files\n`;
      md += `| File | Size |\n|------|------|\n`;
      for (const file of bundleAnalysis.largeFiles.slice(0, 5)) {
        md += `| ${file.path} | ${(file.size / 1000).toFixed(0)}KB |\n`;
      }
      md += '\n';
    }

    if (bundleAnalysis.duplicateModules.length > 0) {
      md += `### Duplicate Modules\n`;
      for (const dup of bundleAnalysis.duplicateModules.slice(0, 3)) {
        md += `- **${dup.name}**: ${dup.count} copies (${(dup.totalSize / 1000).toFixed(0)}KB total)\n`;
      }
      md += '\n';
    }

    return md;
  }

  private static generateMemorySection(report: PerformanceAuditReport): string {
    const { memoryAnalysis } = report;
    let md = `## Memory Analysis\n\n`;
    md += `**Heap Used:** ${(memoryAnalysis.heapUsed / 1000000).toFixed(1)}MB\n`;
    md += `**Heap Total:** ${(memoryAnalysis.heapTotal / 1000000).toFixed(1)}MB\n\n`;

    if (memoryAnalysis.estimatedMemoryLeaks.length > 0) {
      md += `### Potential Memory Leaks\n`;
      for (const leak of memoryAnalysis.estimatedMemoryLeaks.slice(0, 5)) {
        md += `- **${leak.name}** (${(leak.confidence * 100).toFixed(0)}% confidence)\n`;
      }
      md += '\n';
    }

    return md;
  }

  private static generateRenderSection(report: PerformanceAuditReport): string {
    const { renderAnalysis } = report;
    let md = `## Render Performance\n\n`;
    md += `**Avg Render Time:** ${renderAnalysis.avgRenderTime.toFixed(0)}ms\n`;
    md += `**Max Render Time:** ${renderAnalysis.maxRenderTime.toFixed(0)}ms\n`;
    md += `**Animation FPS:** ${renderAnalysis.animationPerformance.fps}\n\n`;

    if (renderAnalysis.slowComponents.length > 0) {
      md += `### Slow Components\n`;
      md += `| Component | Avg Time | Renders | Impact |\n`;
      md += `|-----------|----------|---------|--------|\n`;
      for (const comp of renderAnalysis.slowComponents.slice(0, 5)) {
        md += `| ${comp.name} | ${comp.avgRenderTime.toFixed(0)}ms | ${comp.renders} | ${comp.impact} |\n`;
      }
      md += '\n';
    }

    return md;
  }

  private static generateNetworkSection(report: PerformanceAuditReport): string {
    const { networkAnalysis } = report;
    let md = `## Network Analysis\n\n`;
    md += `**Total Requests:** ${networkAnalysis.totalRequests}\n`;
    md += `**Total Data:** ${(networkAnalysis.totalDataTransferred / 1000000).toFixed(1)}MB\n`;
    md += `**Avg Latency:** ${networkAnalysis.averageLatency}ms\n`;
    md += `**Cache Hit Rate:** ${(networkAnalysis.cacheMetrics.hitRate * 100).toFixed(1)}%\n\n`;

    if (networkAnalysis.slowEndpoints.length > 0) {
      md += `### Slow Endpoints\n`;
      md += `| URL | Method | Latency | Requests |\n`;
      md += `|-----|--------|---------|----------|\n`;
      for (const ep of networkAnalysis.slowEndpoints.slice(0, 5)) {
        md += `| ${ep.url} | ${ep.method} | ${ep.avgLatency.toFixed(0)}ms | ${ep.requests} |\n`;
      }
      md += '\n';
    }

    return md;
  }

  private static generateDependencySection(report: PerformanceAuditReport): string {
    const { dependencyAnalysis } = report;
    let md = `## Dependency Analysis\n\n`;
    md += `**Total Dependencies:** ${dependencyAnalysis.totalDependencies}\n`;
    md += `**Vulnerabilities:** ${dependencyAnalysis.vulnerabilities.length}\n`;
    md += `**Outdated:** ${dependencyAnalysis.outdatedDependencies.length}\n`;
    md += `**Unused:** ${dependencyAnalysis.unusedDependencies.length}\n\n`;

    if (dependencyAnalysis.vulnerabilities.length > 0) {
      md += `### Security Vulnerabilities\n`;
      for (const vuln of dependencyAnalysis.vulnerabilities.slice(0, 5)) {
        md += `- **${vuln.packageName}**: ${vuln.description} [${vuln.severity}]\n`;
      }
      md += '\n';
    }

    return md;
  }

  private static generateRuntimeSection(report: PerformanceAuditReport): string {
    const { runtimeAnalysis } = report;
    let md = `## Runtime Performance\n\n`;
    md += `**Startup Time:** ${runtimeAnalysis.startupTime.toFixed(0)}ms\n`;
    md += `**Time to Interactive:** ${runtimeAnalysis.timeToInteractive.toFixed(0)}ms\n`;
    md += `**First Paint:** ${runtimeAnalysis.firstPaint.toFixed(0)}ms\n`;
    md += `**First Contentful Paint:** ${runtimeAnalysis.firstContentfulPaint.toFixed(0)}ms\n\n`;
    return md;
  }

  private static generateAssetSection(report: PerformanceAuditReport): string {
    const { assetAnalysis } = report;
    let md = `## Asset Analysis\n\n`;
    md += `**Total Asset Size:** ${(assetAnalysis.totalAssetSize / 1000).toFixed(0)}KB\n`;
    md += `**Image Assets:** ${assetAnalysis.images.largestImages.length}\n`;
    md += `**Font Files:** ${assetAnalysis.fonts.loadedFonts.length}\n\n`;

    if (assetAnalysis.images.formatOpportunities.length > 0) {
      md += `### Image Optimization Opportunities\n`;
      for (const opp of assetAnalysis.images.formatOpportunities.slice(0, 5)) {
        md += `- **${opp.image}**: Convert ${opp.currentFormat} → ${opp.suggestedFormat} (save ${(opp.potentialSavings / 1000).toFixed(0)}KB)\n`;
      }
      md += '\n';
    }

    return md;
  }

  private static generateRecommendationsSection(recommendations: Recommendation[]): string {
    let md = `## Recommendations\n\n`;

    const critical = recommendations.filter(r => r.severity === 'CRITICAL');
    const high = recommendations.filter(r => r.severity === 'HIGH');
    const medium = recommendations.filter(r => r.severity === 'MEDIUM');
    const low = recommendations.filter(r => r.severity === 'LOW');

    for (const [severity, recs] of [
      ['CRITICAL', critical],
      ['HIGH', high],
      ['MEDIUM', medium],
      ['LOW', low],
    ]) {
      if ((recs as any[]).length === 0) continue;

      md += `### ${severity} Priority (${(recs as any[]).length})\n\n`;

      for (const rec of (recs as any[]).slice(0, 10)) {
        md += `#### ${rec.title}\n`;
        md += `${rec.description}\n\n`;
        md += `- **Impact:** ${rec.impact}\n`;
        md += `- **Effort:** ${rec.effort}\n`;
        if (rec.estimatedSavings?.bundleSize) {
          md += `- **Estimated Savings:** ${(rec.estimatedSavings.bundleSize / 1000).toFixed(0)}KB\n`;
        }
        md += '\n';
      }
    }

    return md;
  }

  // ========================================================================
  // HTML HELPER METHODS
  // ========================================================================

  private static generateHTMLBundle(report: PerformanceAuditReport): string {
    const { bundleAnalysis } = report;
    return `<div class="section">
            <h2>📦 Bundle Analysis</h2>
            <div class="metric">
                <div class="metric-item">
                    <div class="metric-label">Total Size</div>
                    <div class="metric-value">${(bundleAnalysis.totalSize / 1000).toFixed(0)}KB</div>
                </div>
                <div class="metric-item">
                    <div class="metric-label">Gzip Size</div>
                    <div class="metric-value">${(bundleAnalysis.gzipSize / 1000).toFixed(0)}KB</div>
                </div>
            </div>
            ${
              bundleAnalysis.largeFiles.length > 0
                ? `
            <h3>Largest Files</h3>
            <table>
                <thead><tr><th>File</th><th>Size</th></tr></thead>
                <tbody>
                    ${bundleAnalysis.largeFiles
                      .slice(0, 10)
                      .map(
                        f => `<tr><td>${f.path}</td><td>${(f.size / 1000).toFixed(0)}KB</td></tr>`
                      )
                      .join('')}
                </tbody>
            </table>
            `
                : ''
            }
        </div>`;
  }

  private static generateHTMLMemory(report: PerformanceAuditReport): string {
    return `<div class="section">
            <h2>💾 Memory Analysis</h2>
            <div class="metric">
                <div class="metric-item">
                    <div class="metric-label">Heap Used</div>
                    <div class="metric-value">${(report.memoryAnalysis.heapUsed / 1000000).toFixed(1)}MB</div>
                </div>
                <div class="metric-item">
                    <div class="metric-label">Potential Leaks</div>
                    <div class="metric-value">${report.memoryAnalysis.estimatedMemoryLeaks.length}</div>
                </div>
            </div>
        </div>`;
  }

  private static generateHTMLRender(report: PerformanceAuditReport): string {
    return `<div class="section">
            <h2>⚡ Render Performance</h2>
            <div class="metric">
                <div class="metric-item">
                    <div class="metric-label">Avg Render Time</div>
                    <div class="metric-value">${report.renderAnalysis.avgRenderTime.toFixed(0)}ms</div>
                </div>
                <div class="metric-item">
                    <div class="metric-label">Animation FPS</div>
                    <div class="metric-value">${report.renderAnalysis.animationPerformance.fps}</div>
                </div>
            </div>
        </div>`;
  }

  private static generateHTMLNetwork(report: PerformanceAuditReport): string {
    return `<div class="section">
            <h2>🌐 Network Analysis</h2>
            <div class="metric">
                <div class="metric-item">
                    <div class="metric-label">Total Requests</div>
                    <div class="metric-value">${report.networkAnalysis.totalRequests}</div>
                </div>
                <div class="metric-item">
                    <div class="metric-label">Avg Latency</div>
                    <div class="metric-value">${report.networkAnalysis.averageLatency}ms</div>
                </div>
            </div>
        </div>`;
  }

  private static generateHTMLDependencies(report: PerformanceAuditReport): string {
    return `<div class="section">
            <h2>📚 Dependency Analysis</h2>
            <div class="metric">
                <div class="metric-item">
                    <div class="metric-label">Total</div>
                    <div class="metric-value">${report.dependencyAnalysis.totalDependencies}</div>
                </div>
                <div class="metric-item">
                    <div class="metric-label">Vulnerabilities</div>
                    <div class="metric-value">${report.dependencyAnalysis.vulnerabilities.length}</div>
                </div>
            </div>
        </div>`;
  }

  private static generateHTMLAssets(report: PerformanceAuditReport): string {
    return `<div class="section">
            <h2>🖼️ Asset Analysis</h2>
            <div class="metric">
                <div class="metric-item">
                    <div class="metric-label">Total Size</div>
                    <div class="metric-value">${(report.assetAnalysis.totalAssetSize / 1000).toFixed(0)}KB</div>
                </div>
                <div class="metric-item">
                    <div class="metric-label">Images</div>
                    <div class="metric-value">${report.assetAnalysis.images.largestImages.length}</div>
                </div>
            </div>
        </div>`;
  }

  private static generateHTMLRecommendations(recommendations: Recommendation[]): string {
    const critical = recommendations.filter(r => r.severity === 'CRITICAL').length;
    const high = recommendations.filter(r => r.severity === 'HIGH').length;

    return `<div class="section">
            <h2>🎯 Recommendations</h2>
            <p>Total recommendations: <strong>${recommendations.length}</strong></p>
            
            <div class="score-card">
                ${
                  critical > 0
                    ? `<div class="card critical">
                    <h3>Critical</h3>
                    <div class="value">${critical}</div>
                </div>`
                    : ''
                }
                ${
                  high > 0
                    ? `<div class="card high">
                    <h3>High</h3>
                    <div class="value">${high}</div>
                </div>`
                    : ''
                }
            </div>
            
            <div class="recommendations">
                ${recommendations
                  .slice(0, 15)
                  .map(
                    rec => `
                <div class="recommendation-item">
                    <h4>${rec.title}</h4>
                    <p>${rec.description}</p>
                    <span class="severity-badge ${rec.severity.toLowerCase()}">${rec.severity}</span>
                    <span class="severity-badge" style="background: #9b59b6; color: white;">Effort: ${rec.effort}</span>
                    <div class="effort">Impact: ${rec.impact}</div>
                </div>
                `
                  )
                  .join('')}
            </div>
        </div>`;
  }

  /**
   * Save report to file
   */
  static saveReport(
    report: PerformanceAuditReport,
    format: 'json' | 'html' | 'markdown' = 'json',
    outputPath?: string
  ): string {
    let content = '';
    let ext = format;

    switch (format) {
      case 'json':
        content = this.generateJSON(report);
        break;
      case 'html':
        content = this.generateHTML(report);
        break;
      case 'markdown':
        content = this.generateMarkdown(report);
        ext = 'md';
        break;
    }

    const fileName = outputPath || `performance-audit-${new Date().getTime()}.${ext}`;
    const filePath = path.isAbsolute(fileName) ? fileName : path.join(process.cwd(), fileName);

    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, content);

    return filePath;
  }
}
