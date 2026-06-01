# CI/CD Caching Strategy

## Overview

This document describes the incremental build and caching strategy implemented to reduce CI/CD build times from **10-15 minutes to 2-3 minutes** (80% reduction).

## Performance Metrics

### Before Optimization
- **Build Time**: 10-15 minutes
- **Cache Strategy**: None
- **Dependency Installation**: Full install every time
- **Native Builds**: Full rebuild every time

### After Optimization (Target)
- **Build Time**: 2-3 minutes with cache hits
- **Cache Hit Rate**: 85-95% for typical changes
- **Dependency Installation**: < 30 seconds with cache
- **Native Builds**: Incremental compilation

## Caching Layers

### 1. Dependency Caching

#### Node.js Dependencies
```yaml
- name: Cache node_modules
  uses: actions/cache@v4
  with:
    path: |
      node_modules
      ~/.npm
    key: ${{ runner.os }}-node-modules-${{ hashFiles('package-lock.json') }}
    restore-keys: |
      ${{ runner.os }}-node-modules-
```

**Cache Key Strategy:**
- Primary key: `{OS}-node-modules-{package-lock.json hash}`
- Restore keys: Fallback to any previous node_modules cache
- **Invalidation**: Automatic when `package-lock.json` changes

**Benefits:**
- Reduces `npm ci` from 3-5 minutes to < 30 seconds
- Saves bandwidth and npm registry load

#### Python Dependencies
```yaml
- name: Cache Python dependencies
  uses: actions/cache@v4
  with:
    path: ~/.cache/pip
    key: ${{ runner.os }}-pip-${{ hashFiles('**/requirements.txt', 'scripts/subset-fonts.py') }}
```

**Benefits:**
- Faster font subsetting setup
- Consistent fonttools version

### 2. Build Artifact Caching

#### TypeScript Build Info
```yaml
- name: Cache TypeScript build info
  uses: actions/cache@v4
  with:
    path: |
      .tsbuildinfo
      **/.tsbuildinfo
    key: ${{ runner.os }}-typescript-${{ hashFiles('tsconfig.json', 'src/**/*.ts', 'src/**/*.tsx') }}
```

**Benefits:**
- Enables incremental TypeScript compilation
- Only recompiles changed files
- Reduces type checking time by 60-70%

#### Jest Cache
```yaml
- name: Cache Jest
  uses: actions/cache@v4
  with:
    path: |
      .jest-cache
      coverage
    key: ${{ runner.os }}-jest-${{ hashFiles('jest.config.js', 'src/**/*.test.ts') }}
```

**Benefits:**
- Faster test execution
- Reuses transformed modules
- Reduces test time by 40-50%

#### ESLint Cache
```yaml
- name: Cache ESLint
  uses: actions/cache@v4
  with:
    path: .eslintcache
    key: ${{ runner.os }}-eslint-${{ hashFiles('eslint.config.js', 'src/**/*.ts') }}
```

**Benefits:**
- Only lints changed files
- Reduces linting time by 70-80%

### 3. Expo/Metro Caching

#### Expo Cache
```yaml
- name: Cache Expo
  uses: actions/cache@v4
  with:
    path: |
      ~/.expo
      .expo
      .expo-shared
    key: ${{ runner.os }}-expo-${{ hashFiles('app.json', 'package-lock.json') }}
```

#### Metro Bundler Cache
```yaml
- name: Cache Metro bundler
  uses: actions/cache@v4
  with:
    path: |
      .metro-cache
      node_modules/.cache/metro
    key: ${{ runner.os }}-metro-${{ hashFiles('metro.config.js', 'package-lock.json') }}
```

**Benefits:**
- Faster JavaScript bundling
- Reuses transformed modules
- Reduces bundle time by 50-60%

### 4. Native Build Caching

#### Android - Gradle Cache
```yaml
- name: Cache Gradle dependencies
  uses: actions/cache@v4
  with:
    path: |
      ~/.gradle/caches
      ~/.gradle/daemon
    key: ${{ runner.os }}-gradle-${{ hashFiles('android/**/*.gradle*') }}
```

```yaml
- name: Cache Android build output
  uses: actions/cache@v4
  with:
    path: |
      android/app/build
      android/build
    key: ${{ runner.os }}-android-build-${{ hashFiles('android/**/*.gradle*', 'src/**') }}
```

**Benefits:**
- Reuses compiled native modules
- Incremental compilation of Java/Kotlin code
- Reduces Android build time by 70-80%

#### iOS - CocoaPods & Xcode Cache
```yaml
- name: Cache CocoaPods
  uses: actions/cache@v4
  with:
    path: |
      ios/Pods
      ~/Library/Caches/CocoaPods
      ~/.cocoapods
    key: ${{ runner.os }}-pods-${{ hashFiles('ios/Podfile.lock') }}
```

```yaml
- name: Cache Xcode DerivedData
  uses: actions/cache@v4
  with:
    path: |
      ~/Library/Developer/Xcode/DerivedData
      ios/build
    key: ${{ runner.os }}-xcode-${{ hashFiles('ios/**/*.xcodeproj/**', 'ios/Podfile.lock') }}
```

**Benefits:**
- Reuses compiled frameworks
- Incremental Swift/Objective-C compilation
- Reduces iOS build time by 60-70%

### 5. Asset Caching

#### Font Subsetting Cache
```yaml
- name: Cache subsetted fonts
  uses: actions/cache@v4
  with:
    path: |
      assets/fonts/*.ttf
      !assets/fonts/original/*.ttf
    key: ${{ runner.os }}-fonts-${{ hashFiles('assets/fonts/original/*.ttf', 'scripts/subset-fonts.py') }}
```

**Benefits:**
- Skips font subsetting when fonts unchanged
- Saves 1-2 minutes per build

#### Expo Build Output Cache
```yaml
- name: Cache Expo build output
  uses: actions/cache@v4
  with:
    path: |
      dist
      .expo/web
    key: ${{ runner.os }}-expo-build-${{ hashFiles('app/**/*', 'src/**/*') }}
```

## EAS Build Caching

### Configuration in `eas.json`

```json
{
  "build": {
    "production": {
      "cache": {
        "key": "production-cache-v1",
        "paths": ["node_modules", ".expo", ".metro-cache"],
        "cacheDefaultPaths": true
      },
      "android": {
        "cache": {
          "key": "android-production-cache",
          "paths": ["android/.gradle", "android/app/build"]
        }
      },
      "ios": {
        "cache": {
          "key": "ios-production-cache",
          "paths": ["ios/Pods", "ios/build"]
        }
      }
    }
  }
}
```

### Cache Versioning

Use versioned cache keys to force cache invalidation when needed:
- `production-cache-v1` → `production-cache-v2`

## Cache Invalidation Strategy

### Automatic Invalidation

Caches are automatically invalidated when:
1. **Dependencies change**: `package-lock.json`, `Podfile.lock`, `build.gradle` modified
2. **Configuration changes**: `tsconfig.json`, `jest.config.js`, `metro.config.js` modified
3. **Source code changes**: Relevant source files modified (for build output caches)

### Manual Invalidation

To manually invalidate caches:

1. **Update cache key version** in workflow files:
   ```yaml
   key: ${{ runner.os }}-node-modules-v2-${{ hashFiles('package-lock.json') }}
   ```

2. **Clear GitHub Actions cache** via UI:
   - Go to repository Settings → Actions → Caches
   - Delete specific caches

3. **Use workflow dispatch** with cache-busting parameter

## Workflow Optimizations

### 1. Concurrency Control

```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true
```

**Benefits:**
- Cancels outdated builds when new commits pushed
- Saves CI minutes
- Faster feedback

### 2. Conditional Installation

```yaml
- name: Install dependencies
  if: steps.cache-node-modules.outputs.cache-hit != 'true'
  run: npm ci --prefer-offline --no-audit
```

**Benefits:**
- Skips installation when cache hit
- Saves 3-5 minutes per build

### 3. Path-based Triggers

```yaml
on:
  push:
    paths:
      - 'app/**'
      - 'src/**'
      - 'package.json'
```

**Benefits:**
- Only runs builds when relevant files change
- Skips builds for documentation-only changes

### 4. Parallel Jobs

```yaml
jobs:
  build-android:
    # ...
  build-ios:
    # ...
```

**Benefits:**
- Builds Android and iOS in parallel
- Reduces total pipeline time

## Monitoring & Metrics

### Cache Hit Rate Monitoring

The workflows include cache statistics reporting:

```yaml
- name: Report cache statistics
  run: |
    echo "## 📊 Cache Statistics" >> $GITHUB_STEP_SUMMARY
    echo "| Cache | Status |" >> $GITHUB_STEP_SUMMARY
    echo "| Node Modules | ${{ steps.cache-node-modules.outputs.cache-hit == 'true' && '✅ Hit' || '❌ Miss' }} |" >> $GITHUB_STEP_SUMMARY
```

### Key Metrics to Track

1. **Build Duration**: Target 2-3 minutes with cache hits
2. **Cache Hit Rate**: Target 85-95%
3. **Cache Size**: Monitor to stay within GitHub limits (10GB per repo)
4. **CI Minutes Usage**: Should decrease by 70-80%

### GitHub Actions Cache Limits

- **Maximum cache size**: 10GB per repository
- **Cache retention**: 7 days (unused caches)
- **Cache eviction**: Least recently used (LRU)

## Best Practices

### 1. Cache Key Design

✅ **Good**: Include all relevant dependencies
```yaml
key: ${{ runner.os }}-node-${{ hashFiles('package-lock.json') }}
```

❌ **Bad**: Too generic, causes false cache hits
```yaml
key: ${{ runner.os }}-node
```

### 2. Restore Keys

Use restore keys for partial cache hits:
```yaml
restore-keys: |
  ${{ runner.os }}-node-modules-
  ${{ runner.os }}-node-
```

### 3. Cache Paths

Be specific about what to cache:
```yaml
path: |
  node_modules
  ~/.npm
```

### 4. Incremental Compilation Flags

Enable incremental compilation in tools:
- TypeScript: `--incremental`
- Jest: `--cache`
- ESLint: `--cache`

## Troubleshooting

### Cache Not Restoring

1. Check cache key matches exactly
2. Verify paths exist
3. Check cache size limits
4. Review GitHub Actions logs

### Stale Cache Issues

1. Update cache key version
2. Clear old caches manually
3. Add more specific hash inputs

### Build Failures After Cache Hit

1. Cache may be corrupted - invalidate and rebuild
2. Check for environment-specific dependencies
3. Verify cache paths are correct

## Migration Guide

### From Old CI to Optimized CI

1. **Backup existing workflows**:
   ```bash
   cp .github/workflows/ci.yml .github/workflows/ci.yml.backup
   ```

2. **Update workflows** to use new optimized versions:
   - Replace `ci.yml` with `ci-optimized.yml`
   - Add `build-native.yml` for native builds
   - Update `test.yml` with `test-optimized.yml`

3. **Update EAS configuration**:
   - Add cache configuration to `eas.json`

4. **Test the changes**:
   - Create a test PR
   - Monitor build times
   - Verify cache hits

5. **Monitor and adjust**:
   - Track cache hit rates
   - Adjust cache keys if needed
   - Fine-tune cache paths

## Expected Results

### Build Time Comparison

| Scenario | Before | After | Improvement |
|----------|--------|-------|-------------|
| Full build (cache miss) | 10-15 min | 8-10 min | 20-30% |
| Typical change (cache hit) | 10-15 min | 2-3 min | 80% |
| Dependency update | 10-15 min | 5-7 min | 50% |
| Documentation only | 10-15 min | Skipped | 100% |

### Cost Savings

- **CI minutes saved**: ~70-80% reduction
- **Faster feedback**: Developers get results in 2-3 minutes
- **More frequent deployments**: Reduced build time enables more iterations

## Related Issues

- #24 - Performance optimization
- #25 - Build time improvements
- #27 - CI/CD enhancements
- #241 - Incremental builds and caching (this implementation)

## References

- [GitHub Actions Caching](https://docs.github.com/en/actions/using-workflows/caching-dependencies-to-speed-up-workflows)
- [EAS Build Caching](https://docs.expo.dev/build-reference/caching/)
- [Gradle Build Cache](https://docs.gradle.org/current/userguide/build_cache.html)
- [CocoaPods Caching](https://guides.cocoapods.org/using/using-cocoapods.html)
