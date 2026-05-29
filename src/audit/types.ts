/**
 * Performance Audit System Types
 * Comprehensive types for all performance analysis aspects
 */

// ============================================================================
// SEVERITY LEVELS
// ============================================================================
export enum SeverityLevel {
  CRITICAL = 'CRITICAL',
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
  INFO = 'INFO',
}

// ============================================================================
// METRIC TYPES
// ============================================================================
export interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  threshold?: number;
  baseline?: number;
  trend?: 'improving' | 'degrading' | 'stable';
}

// ============================================================================
// BUNDLE ANALYSIS
// ============================================================================
export interface BundleAnalysis {
  totalSize: number;
  gzipSize: number;
  chunks: BundleChunk[];
  largeFiles: BundleFile[];
  duplicateModules: DuplicateModule[];
  unusedDependencies: string[];
  largeDevDependencies: string[];
}

export interface BundleChunk {
  name: string;
  size: number;
  gzipSize: number;
  files: number;
  isLazy: boolean;
}

export interface BundleFile {
  path: string;
  size: number;
  gzipSize: number;
  module: string;
}

export interface DuplicateModule {
  name: string;
  count: number;
  totalSize: number;
  versions: string[];
}

// ============================================================================
// MEMORY ANALYSIS
// ============================================================================
export interface MemoryAnalysis {
  heapUsed: number;
  heapTotal: number;
  external: number;
  rss: number;
  jsHeapSizeLimit: number;
  estimatedMemoryLeaks: MemoryLeak[];
  largeObjects: LargeObject[];
}

export interface MemoryLeak {
  name: string;
  detectedAt: string;
  size: number;
  confidence: number;
  stackTrace?: string;
}

export interface LargeObject {
  type: string;
  size: number;
  count: number;
  location: string;
}

// ============================================================================
// RENDER PERFORMANCE
// ============================================================================
export interface RenderAnalysis {
  avgRenderTime: number;
  maxRenderTime: number;
  slowComponents: SlowComponent[];
  rerenderIssues: RerenderIssue[];
  animationPerformance: AnimationMetrics;
}

export interface SlowComponent {
  name: string;
  avgRenderTime: number;
  renders: number;
  impact: 'high' | 'medium' | 'low';
}

export interface RerenderIssue {
  component: string;
  parentComponent?: string;
  unnecessaryRenders: number;
  reason: string;
  fix: string;
}

export interface AnimationMetrics {
  fps: number;
  droppedFrames: number;
  jankFreeFrames: number;
  totalAnimations: number;
}

// ============================================================================
// NETWORK ANALYSIS
// ============================================================================
export interface NetworkAnalysis {
  totalRequests: number;
  totalDataTransferred: number;
  averageLatency: number;
  slowEndpoints: NetworkEndpoint[];
  redundantRequests: RedundantRequest[];
  unoptimizedAssets: UnoptimizedAsset[];
  cacheMetrics: CacheMetrics;
}

export interface NetworkEndpoint {
  url: string;
  method: string;
  avgLatency: number;
  errorRate: number;
  requests: number;
  dataSize: number;
}

export interface RedundantRequest {
  url: string;
  occurrences: number;
  totalDataWasted: number;
  suggestion: string;
}

export interface UnoptimizedAsset {
  url: string;
  currentSize: number;
  optimizedSize: number;
  optimization: string;
  savings: number;
}

export interface CacheMetrics {
  hitRate: number;
  missRate: number;
  averageAge: number;
  staleRequests: number;
}

// ============================================================================
// DEPENDENCY ANALYSIS
// ============================================================================
export interface DependencyAnalysis {
  totalDependencies: number;
  outdatedDependencies: OutdatedDependency[];
  vulnerabilities: Vulnerability[];
  unusedDependencies: string[];
  largeTransitiveDependencies: TransitiveDependency[];
  licenseCompliance: LicenseIssue[];
}

export interface OutdatedDependency {
  name: string;
  currentVersion: string;
  latestVersion: string;
  majorVersionsBehind: number;
  releaseDate: string;
}

export interface Vulnerability {
  packageName: string;
  severity: SeverityLevel;
  id: string;
  description: string;
  affectedVersions: string;
  fixVersion?: string;
}

export interface TransitiveDependency {
  name: string;
  requestedBy: string[];
  totalSize: number;
  depth: number;
}

export interface LicenseIssue {
  packageName: string;
  license: string;
  status: 'compliant' | 'warning' | 'violation';
  reason?: string;
}

// ============================================================================
// RUNTIME ANALYSIS
// ============================================================================
export interface RuntimeAnalysis {
  startupTime: number;
  timeToInteractive: number;
  firstPaint: number;
  firstContentfulPaint: number;
  cpuUsage: CPUMetrics;
  jsExecutionTime: number;
  eventLoopLag: number;
}

export interface CPUMetrics {
  average: number;
  peak: number;
  distribution: Record<string, number>;
}

// ============================================================================
// ASSET ANALYSIS
// ============================================================================
export interface AssetAnalysis {
  images: ImageMetrics;
  fonts: FontMetrics;
  totalAssetSize: number;
  unoptimizedAssets: string[];
}

export interface ImageMetrics {
  totalSize: number;
  largestImages: ImageInfo[];
  unusedImages: string[];
  formatOpportunities: FormatOpportunity[];
}

export interface ImageInfo {
  path: string;
  size: number;
  dimensions: { width: number; height: number };
  format: string;
}

export interface FormatOpportunity {
  image: string;
  currentFormat: string;
  suggestedFormat: string;
  potentialSavings: number;
}

export interface FontMetrics {
  totalSize: number;
  loadedFonts: FontInfo[];
  unusedFontVariants: string[];
}

export interface FontInfo {
  name: string;
  size: number;
  variants: string[];
  usage: number;
}

// ============================================================================
// RECOMMENDATIONS
// ============================================================================
export interface Recommendation {
  id: string;
  title: string;
  description: string;
  severity: SeverityLevel;
  category: RecommendationCategory;
  impact: string;
  effort: 'LOW' | 'MEDIUM' | 'HIGH';
  estimatedSavings?: {
    bundleSize?: number;
    memory?: number;
    latency?: number;
    renderTime?: number;
  };
  implementation: string;
  references?: string[];
  priority: number; // 1-100, higher = more important
}

export enum RecommendationCategory {
  BUNDLE = 'bundle-size',
  MEMORY = 'memory-management',
  RENDERING = 'rendering-performance',
  NETWORK = 'network-optimization',
  DEPENDENCIES = 'dependency-management',
  RUNTIME = 'runtime-performance',
  ASSETS = 'asset-optimization',
  CACHING = 'caching-strategy',
  CODE_QUALITY = 'code-quality',
}

// ============================================================================
// AUDIT REPORT
// ============================================================================
export interface PerformanceAuditReport {
  // Metadata
  timestamp: string;
  version: string;
  environment: string;
  duration: number;

  // Overall Score
  overallScore: number; // 0-100
  trend: 'improving' | 'degrading' | 'stable';
  previousScore?: number;

  // Analyses
  bundleAnalysis: BundleAnalysis;
  memoryAnalysis: MemoryAnalysis;
  renderAnalysis: RenderAnalysis;
  networkAnalysis: NetworkAnalysis;
  dependencyAnalysis: DependencyAnalysis;
  runtimeAnalysis: RuntimeAnalysis;
  assetAnalysis: AssetAnalysis;

  // Recommendations (prioritized)
  recommendations: Recommendation[];

  // Summary
  executiveSummary: ExecutiveSummary;

  // Comparison
  comparison?: ComparisonData;
}

export interface ExecutiveSummary {
  title: string;
  overview: string;
  keyFindings: string[];
  topPriorities: string[];
  estimatedImpact: {
    bundleReduction?: string;
    performanceGain?: string;
    memoryImprovement?: string;
    networkOptimization?: string;
  };
  nextSteps: string[];
}

export interface ComparisonData {
  previousScore: number;
  scoreChange: number;
  bestCategory: string;
  worstCategory: string;
  metrics: {
    name: string;
    previous: number;
    current: number;
    change: number;
    percentChange: number;
  }[];
}

// ============================================================================
// AUDIT OPTIONS
// ============================================================================
export interface AuditOptions {
  verbose?: boolean;
  format?: 'json' | 'html' | 'markdown' | 'all';
  outputPath?: string;
  analyzeSourceMap?: boolean;
  includeLicenseAudit?: boolean;
  compareWithBaseline?: boolean;
  baselineFile?: string;
  customThresholds?: Record<string, number>;
}

// ============================================================================
// ANALYZER INTERFACE
// ============================================================================
export interface IPerformanceAnalyzer {
  analyze(): Promise<any>;
  validate(): Promise<boolean>;
}
