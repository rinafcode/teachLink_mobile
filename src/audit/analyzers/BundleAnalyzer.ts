/**
 * Bundle Size Analyzer
 * Analyzes bundle size, chunks, and identifies optimization opportunities
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import type {
  BundleAnalysis,
  BundleChunk,
  BundleFile,
  DuplicateModule,
  IPerformanceAnalyzer,
} from './types';

export class BundleAnalyzer implements IPerformanceAnalyzer {
  private projectRoot: string;
  private nodeModulesPath: string;

  constructor(projectRoot: string = process.cwd()) {
    this.projectRoot = projectRoot;
    this.nodeModulesPath = path.join(projectRoot, 'node_modules');
  }

  async analyze(): Promise<BundleAnalysis> {
    try {
      return {
        totalSize: await this.calculateTotalSize(),
        gzipSize: await this.calculateGzipSize(),
        chunks: await this.analyzeChunks(),
        largeFiles: await this.findLargeFiles(),
        duplicateModules: await this.findDuplicateModules(),
        unusedDependencies: await this.findUnusedDependencies(),
        largeDevDependencies: await this.findLargeDevDependencies(),
      };
    } catch (error) {
      console.error('Bundle analysis failed:', error);
      throw error;
    }
  }

  async validate(): Promise<boolean> {
    try {
      const analysis = await this.analyze();
      const hasData =
        analysis.totalSize > 0 || analysis.chunks.length > 0 || analysis.largeFiles.length > 0;
      return hasData;
    } catch {
      return false;
    }
  }

  /**
   * Calculate total bundle size
   */
  private async calculateTotalSize(): Promise<number> {
    try {
      const distPath = path.join(this.projectRoot, '.expo');
      if (!fs.existsSync(distPath)) {
        return this.estimateBundleSize();
      }

      let totalSize = 0;
      this.walkDir(distPath, (filePath: string) => {
        if (
          filePath.endsWith('.js') ||
          filePath.endsWith('.jsx') ||
          filePath.endsWith('.ts') ||
          filePath.endsWith('.tsx')
        ) {
          const stats = fs.statSync(filePath);
          totalSize += stats.size;
        }
      });

      return totalSize;
    } catch {
      return 0;
    }
  }

  /**
   * Estimate bundle size by analyzing source files
   */
  private estimateBundleSize(): number {
    const srcPath = path.join(this.projectRoot, 'src');
    let totalSize = 0;

    if (!fs.existsSync(srcPath)) return 0;

    this.walkDir(srcPath, (filePath: string) => {
      if (filePath.endsWith('.ts') || filePath.endsWith('.tsx') || filePath.endsWith('.js')) {
        const stats = fs.statSync(filePath);
        totalSize += stats.size;
      }
    });

    return totalSize;
  }

  /**
   * Calculate gzip compressed size
   */
  private async calculateGzipSize(): Promise<number> {
    try {
      // Estimate gzip as ~30% of original size (typical compression ratio)
      const originalSize = await this.calculateTotalSize();
      return Math.round(originalSize * 0.3);
    } catch {
      return 0;
    }
  }

  /**
   * Analyze bundle chunks
   */
  private async analyzeChunks(): Promise<BundleChunk[]> {
    const chunks: BundleChunk[] = [];

    try {
      const appPath = path.join(this.projectRoot, 'app');
      if (fs.existsSync(appPath)) {
        // Main app chunk
        chunks.push(this.createChunk('main', appPath));

        // Lazy-loaded routes
        const files = fs.readdirSync(appPath);
        for (const file of files) {
          if (file.endsWith('.tsx')) {
            chunks.push(
              this.createChunk(path.basename(file, '.tsx'), path.join(appPath, file), true)
            );
          }
        }
      }

      const srcPath = path.join(this.projectRoot, 'src');
      if (fs.existsSync(srcPath)) {
        chunks.push(this.createChunk('src', srcPath));
      }
    } catch (error) {
      console.error('Error analyzing chunks:', error);
    }

    return chunks;
  }

  /**
   * Create a chunk entry
   */
  private createChunk(name: string, dirPath: string, isLazy = false): BundleChunk {
    let size = 0;
    let fileCount = 0;

    if (fs.existsSync(dirPath)) {
      this.walkDir(dirPath, (filePath: string) => {
        if (filePath.endsWith('.ts') || filePath.endsWith('.tsx') || filePath.endsWith('.js')) {
          const stats = fs.statSync(filePath);
          size += stats.size;
          fileCount++;
        }
      });
    }

    return {
      name,
      size,
      gzipSize: Math.round(size * 0.3),
      files: fileCount,
      isLazy,
    };
  }

  /**
   * Find large files
   */
  private async findLargeFiles(threshold = 100000): Promise<BundleFile[]> {
    const largeFiles: BundleFile[] = [];
    const srcPath = path.join(this.projectRoot, 'src');

    if (!fs.existsSync(srcPath)) return [];

    this.walkDir(srcPath, (filePath: string) => {
      if (filePath.endsWith('.ts') || filePath.endsWith('.tsx') || filePath.endsWith('.js')) {
        const stats = fs.statSync(filePath);
        if (stats.size > threshold) {
          largeFiles.push({
            path: path.relative(this.projectRoot, filePath),
            size: stats.size,
            gzipSize: Math.round(stats.size * 0.3),
            module: this.extractModule(filePath),
          });
        }
      }
    });

    return largeFiles.sort((a, b) => b.size - a.size).slice(0, 20);
  }

  /**
   * Find duplicate modules in node_modules
   */
  private async findDuplicateModules(): Promise<DuplicateModule[]> {
    const duplicates: Map<string, DuplicateModule> = new Map();

    if (!fs.existsSync(this.nodeModulesPath)) return [];

    try {
      const modules = fs.readdirSync(this.nodeModulesPath);

      for (const module of modules) {
        if (module.startsWith('.')) continue;

        const packagePath = path.join(this.nodeModulesPath, module);
        const stats = fs.statSync(packagePath);

        if (stats.isDirectory()) {
          const baseName = module.replace(/@.*?\//, '').split('@')[0];

          if (!duplicates.has(baseName)) {
            duplicates.set(baseName, {
              name: baseName,
              count: 0,
              totalSize: 0,
              versions: [],
            });
          }

          const dup = duplicates.get(baseName)!;
          dup.count++;
          dup.totalSize += this.calculateDirSize(packagePath);
          dup.versions.push(this.getPackageVersion(packagePath));
        }
      }

      return Array.from(duplicates.values())
        .filter(d => d.count > 1)
        .sort((a, b) => b.totalSize - a.totalSize);
    } catch (error) {
      console.error('Error finding duplicate modules:', error);
      return [];
    }
  }

  /**
   * Find unused dependencies
   */
  private async findUnusedDependencies(): Promise<string[]> {
    try {
      // Use depcheck tool if available
      const result = execSync('npx depcheck --json', {
        cwd: this.projectRoot,
        encoding: 'utf-8',
      });

      const parsed = JSON.parse(result);
      return parsed.dependencies || [];
    } catch {
      // Fallback: scan for unused imports
      return [];
    }
  }

  /**
   * Find large dev dependencies
   */
  private async findLargeDevDependencies(): Promise<string[]> {
    const largeDevDeps: string[] = [];
    const pkgJsonPath = path.join(this.projectRoot, 'package.json');

    if (!fs.existsSync(pkgJsonPath)) return [];

    try {
      const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf-8'));
      const devDeps = Object.keys(pkgJson.devDependencies || {});

      for (const dep of devDeps) {
        const depPath = path.join(this.nodeModulesPath, dep);
        if (fs.existsSync(depPath)) {
          const size = this.calculateDirSize(depPath);
          if (size > 10000000) {
            // 10MB threshold
            largeDevDeps.push(`${dep} (~${(size / 1000000).toFixed(1)}MB)`);
          }
        }
      }

      return largeDevDeps.sort((a, b) => {
        const sizeA = parseInt(a.match(/\d+\.\d+/) || ['0']);
        const sizeB = parseInt(b.match(/\d+\.\d+/) || ['0']);
        return sizeB - sizeA;
      });
    } catch {
      return [];
    }
  }

  /**
   * Extract module name from file path
   */
  private extractModule(filePath: string): string {
    const relative = path.relative(this.projectRoot, filePath);
    const parts = relative.split(path.sep);
    return parts[0] || 'unknown';
  }

  /**
   * Calculate directory size
   */
  private calculateDirSize(dirPath: string): number {
    let size = 0;
    try {
      this.walkDir(dirPath, (filePath: string) => {
        const stats = fs.statSync(filePath);
        size += stats.size;
      });
    } catch {
      // Ignore errors
    }
    return size;
  }

  /**
   * Get package version
   */
  private getPackageVersion(packagePath: string): string {
    try {
      const pkgJson = JSON.parse(fs.readFileSync(path.join(packagePath, 'package.json'), 'utf-8'));
      return pkgJson.version || '0.0.0';
    } catch {
      return 'unknown';
    }
  }

  /**
   * Walk directory recursively
   */
  private walkDir(
    dirPath: string,
    callback: (filePath: string) => void,
    maxDepth = 10,
    currentDepth = 0
  ): void {
    if (currentDepth >= maxDepth) return;

    try {
      const files = fs.readdirSync(dirPath);

      for (const file of files) {
        if (file.startsWith('.') || file === 'node_modules' || file === '.git') {
          continue;
        }

        const fullPath = path.join(dirPath, file);
        try {
          const stats = fs.statSync(fullPath);

          if (stats.isDirectory()) {
            this.walkDir(fullPath, callback, maxDepth, currentDepth + 1);
          } else {
            callback(fullPath);
          }
        } catch {
          // Skip files that can't be accessed
        }
      }
    } catch {
      // Skip directories that can't be read
    }
  }
}
