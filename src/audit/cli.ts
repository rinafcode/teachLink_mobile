#!/usr/bin/env node

/**
 * Performance Audit CLI
 * Command-line interface for running audits
 */

import * as fs from 'fs';
import * as path from 'path';
import { PerformanceAuditor } from './PerformanceAuditor';

interface CLIOptions {
  help?: boolean;
  format?: string;
  output?: string;
  verbose?: boolean;
  baseline?: string;
  compare?: boolean;
  watch?: boolean;
}

class AuditCLI {
  /**
   * Parse command-line arguments
   */
  private parseArgs(args: string[]): CLIOptions {
    const options: CLIOptions = {
      verbose: true,
    };

    for (let i = 0; i < args.length; i++) {
      const arg = args[i];

      if (arg === '--help' || arg === '-h') {
        options.help = true;
      } else if (arg === '--format' || arg === '-f') {
        options.format = args[++i] || 'json';
      } else if (arg === '--output' || arg === '-o') {
        options.output = args[++i];
      } else if (arg === '--quiet' || arg === '-q') {
        options.verbose = false;
      } else if (arg === '--baseline') {
        options.baseline = args[++i];
      } else if (arg === '--compare' || arg === '-c') {
        options.compare = true;
      } else if (arg === '--watch' || arg === '-w') {
        options.watch = true;
      }
    }

    return options;
  }

  /**
   * Show help message
   */
  private showHelp(): void {
    console.log(`
📊 Performance Audit Tool

Usage:
  npm run audit [options]

Options:
  -h, --help              Show this help message
  -f, --format FORMAT     Output format: json, html, markdown, all (default: json)
  -o, --output PATH       Output file path (default: audit-report)
  -q, --quiet             Suppress verbose output
  -c, --compare           Compare with baseline
  --baseline FILE         Baseline file for comparison (default: audit-baseline.json)
  -w, --watch             Watch for changes and re-run audit

Examples:
  npm run audit
  npm run audit --format html
  npm run audit --format all --output ./reports/audit
  npm run audit --compare --baseline ./baseline.json

Environment Variables:
  NODE_ENV                Set to 'production' for production audit

For more information, visit: https://github.com/rinafcode/teachLink_mobile
    `);
  }

  /**
   * Main entry point
   */
  async run(args: string[]): Promise<void> {
    const options = this.parseArgs(args);

    if (options.help) {
      this.showHelp();
      process.exit(0);
    }

    try {
      const projectRoot = process.cwd();

      // Create auditor
      const auditor = new PerformanceAuditor(projectRoot, {
        verbose: options.verbose,
        format: (options.format || 'json') as any,
        outputPath: options.output,
        compareWithBaseline: options.compare,
        baselineFile: options.baseline,
      });

      // Check status
      const status = await auditor.getStatus();
      if (options.verbose) {
        console.log(`\n${status.ready ? '✅' : '⚠️'} ${status.message}\n`);
      }

      // Run audit
      if (options.watch) {
        console.log('👁️ Watching for changes... (Press Ctrl+C to stop)\n');
        // In watch mode, re-run on file changes
        await this.watchAndAudit(auditor);
      } else {
        // Single run
        const files = await auditor.auditAndReport();

        if (options.verbose) {
          console.log('\n📄 Generated reports:');
          files.forEach(f => console.log(`   ${f}`));
        }

        // If comparing, load baseline
        if (options.compare) {
          this.compareWithBaseline(files[0], options.baseline);
        }
      }
    } catch (error) {
      console.error('❌ Error:', error);
      process.exit(1);
    }
  }

  /**
   * Watch mode - re-run audit on changes
   */
  private async watchAndAudit(auditor: PerformanceAuditor): Promise<void> {
    // Simple implementation - would benefit from fs.watch in production
    let lastAuditTime = Date.now();

    const audit = async () => {
      try {
        await auditor.auditAndReport();
        lastAuditTime = Date.now();
      } catch (error) {
        console.error('Audit error:', error);
      }
    };

    // Initial audit
    await audit();

    // Watch for changes
    const watchDirs = [path.join(process.cwd(), 'src'), path.join(process.cwd(), 'package.json')];

    // Simple implementation using polling
    setInterval(() => {
      try {
        for (const dir of watchDirs) {
          if (fs.existsSync(dir)) {
            const stats = fs.statSync(dir);
            if (stats.mtime.getTime() > lastAuditTime) {
              console.log('\n📝 Changes detected, re-running audit...\n');
              audit();
              break;
            }
          }
        }
      } catch {
        // Ignore stat errors
      }
    }, 5000);
  }

  /**
   * Compare audit with baseline
   */
  private compareWithBaseline(auditFile: string, baselineFile?: string): void {
    const baselinePath = baselineFile || path.join(process.cwd(), 'audit-baseline.json');

    if (!fs.existsSync(baselinePath)) {
      console.log('ℹ️ No baseline found. Run with --baseline to set one.');
      console.log(`📌 To save current audit as baseline, run:`);
      console.log(`   cp ${auditFile} ${baselinePath}`);
      return;
    }

    try {
      const currentAudit = JSON.parse(fs.readFileSync(auditFile, 'utf-8'));
      const baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf-8'));

      console.log('\n📊 Audit Comparison\n');
      console.log(
        `Score: ${baseline.overallScore} → ${currentAudit.overallScore} (${currentAudit.overallScore > baseline.overallScore ? '+' : ''}${currentAudit.overallScore - baseline.overallScore})`
      );
      console.log(
        `Bundle: ${(baseline.bundleAnalysis.totalSize / 1000).toFixed(0)}KB → ${(currentAudit.bundleAnalysis.totalSize / 1000).toFixed(0)}KB`
      );
      console.log(
        `Dependencies: ${baseline.dependencyAnalysis.totalDependencies} → ${currentAudit.dependencyAnalysis.totalDependencies}`
      );
      console.log(
        `Vulnerabilities: ${baseline.dependencyAnalysis.vulnerabilities.length} → ${currentAudit.dependencyAnalysis.vulnerabilities.length}`
      );
    } catch (error) {
      console.error('Error comparing audits:', error);
    }
  }
}

// Run CLI
const cli = new AuditCLI();
cli.run(process.argv.slice(2)).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
