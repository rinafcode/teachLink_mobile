# Image Optimization Architecture

This document describes the progressive image delivery pipeline implemented for issue #231.

## Goals

- Show a low-quality placeholder immediately (LQIP)
- Load full image progressively with a smooth reveal
- Prefer WebP with PNG fallback
- Request device-appropriate variants (1x, 2x, 3x)
- Monitor image load metrics in production

## Client Pipeline

1. CachedImage receives a canonical image URL.
2. The URL is transformed into three variants:
   - LQIP: low quality, blurred, small payload
   - Primary: WebP full-quality variant
   - Fallback: PNG full-quality variant
3. expo-image renders with:
   - source: [primary, fallback]
   - placeholder: LQIP
   - transition: 250ms fade-in
4. Prefetch uses the same optimized candidates so cache warm-up matches runtime requests.

## URL Contract

The client sends query parameters that backend/CDN can honor:

- format: webp or png
- q: quality level
- dpr: device pixel ratio (1-3)
- w: width in device pixels
- h: height in device pixels
- lqip: 1 for placeholder requests
- blur: blur intensity for placeholder

Example:

- Primary: https://cdn.example.com/avatar.jpg?format=webp&q=72&dpr=3&w=264&h=264
- Fallback: https://cdn.example.com/avatar.jpg?format=png&q=72&dpr=3&w=264&h=264
- LQIP: https://cdn.example.com/avatar.jpg?format=webp&q=18&dpr=3&w=264&h=264&lqip=1&blur=24

## Adaptive Sizing

Sizing is calculated from target layout size and current device DPR:

requestedPixels = layoutPixels * dpr

DPR is clamped to 1..3.

## Performance Monitoring

imagePerformanceService records:

- loadTimeMs
- usedFallback
- dpr

Metrics are sent through mobileAnalyticsService with optimization label lqip_webp_progressive.

## Server/CDN Requirements

To meet the full acceptance target, backend image endpoints or CDN transforms should:

- Generate and cache WebP + PNG variants
- Generate LQIP placeholders server-side
- Respect dpr, w, h for variant resizing
- Return cache headers tuned for immutable variant URLs

## Testing Coverage

- CachedImage tests validate progressive sources + placeholder behavior
- usePrefetchImages tests continue validating prefetch orchestration
- imageOptimization unit tests validate URL generation and DPR behavior
