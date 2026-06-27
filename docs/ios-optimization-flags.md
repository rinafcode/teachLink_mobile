# iOS Build Optimization Flags

This document describes the LLVM optimization flags configured for the TeachLink iOS production build.

## Overview

The production iOS build is configured with aggressive LLVM compilation flags to reduce IPA size and improve runtime performance.

## Configured Flags

| Flag | Value | Description |
|------|-------|-------------|
| `SWIFT_OPTIMIZATION_LEVEL` | `-O` | Enables whole-module Swift optimization (equivalent to `-O` / Optimize for Speed) |
| `GCC_OPTIMIZATION_LEVEL` | `3` | Maps to Clang/LLVM `-O3`: enables aggressive loop unrolling, vectorization, and inlining |
| `LLVM_LTO` | `YES` | Enables Link Time Optimization — allows the linker to inline and eliminate dead code across translation units |
| `ENABLE_BITCODE` | `YES` | Embeds LLVM bitcode in the binary, allowing App Store re-optimization and thinner downloads |
| `DEAD_CODE_STRIPPING` | `YES` | Removes unreachable code and data segments at link time |
| `STRIP_INSTALLED_PRODUCT` | `YES` | Strips debug symbols from the final binary |
| `STRIP_STYLE` | `all` | Strips all symbols (local + global) from the shipped binary |
| `DEPLOYMENT_POSTPROCESSING` | `YES` | Enables post-processing steps (stripping, signing) during build |
| `SEPARATE_STRIP` | `YES` | Runs the strip tool as a separate build phase for cleaner output |
| `GCC_GENERATE_DEBUGGING_SYMBOLS` | `NO` | Disables inline debug symbol generation in the release binary |
| `DEBUG_INFORMATION_FORMAT` | `dwarf-with-dsym` | Generates a separate `.dSYM` bundle for crash symbolication without bloating the IPA |
| `COMPILER_INDEX_STORE_ENABLE` | `NO` | Disables Xcode index store generation during CI builds to reduce build time |

## Performance Impact

| Metric | Before | After (Target) | Improvement |
|--------|--------|----------------|-------------|
| IPA Size | 95 MB | ~78 MB | -18% |
| Cold Start | 3.2s | ~2.8s | -12% |
| Runtime Performance | Baseline | Optimized | +10–15% |

## How It Works

### LLVM `-O3` + LTO Pipeline

1. Each Swift/ObjC source file is compiled to LLVM bitcode with `-O3`.
2. At link time, LTO merges all bitcode modules and performs cross-module inlining, dead code elimination, and global constant propagation.
3. The linker emits a single optimized native binary.

### Bitcode

Enabling `ENABLE_BITCODE` embeds the LLVM IR in the IPA. Apple's servers can re-optimize the binary for specific device architectures (e.g., arm64e on newer chips), resulting in smaller over-the-air downloads via App Thinning.

### Symbol Stripping

Debug symbols are stripped from the shipped binary and placed in a separate `.dSYM` file. This reduces IPA size while preserving the ability to symbolicate crash reports from Crashlytics / Sentry.

## Testing Checklist

- [ ] Build succeeds on EAS with `eas build --platform ios --profile production`
- [ ] IPA size is ≤ 80 MB (target: ~78 MB)
- [ ] Cold start measured on iPhone SE (2nd gen) is ≤ 2.9s
- [ ] All app features verified on a real device (not simulator)
- [ ] Crash symbolication works with the generated `.dSYM`
- [ ] No build time regression > 10% vs. baseline

## Notes

- These flags apply **only** to the `production` build profile in `eas.json`.
- `development` and `preview` builds are unaffected and retain fast debug builds.
- If a future Xcode version deprecates `ENABLE_BITCODE`, remove that flag — Apple deprecated bitcode submission for new apps in Xcode 14 but it remains valid for EAS managed builds targeting older SDKs.
