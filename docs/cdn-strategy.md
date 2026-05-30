# TeachLink CDN Delivery and Caching Strategy

This document outlines the architecture, setup, and verification guidelines for static asset delivery via Content Delivery Network (CDN) with aggressive caching.

## 1. Architecture Overview

To achieve near-instantaneous global asset loading and minimize origin server CPU and bandwidth load, all static assets (images, fonts, UI elements) are routed through our global CDN origin:

- **CDN Host**: `https://cdn.teachlink.com`
- **Protocol**: HTTPS over HTTP/2 or HTTP/3
- **Static Assets Scope**: `/assets/**/*` (e.g. `/assets/fonts`, `/assets/images`)

## 2. URL Caching & Versioning Strategy

We use **SemVer Query String Versioning** for cache invalidation (cache busting):

- **Versioning Hook**: The app's `version` field from `package.json` (currently `1.8.0`) is parsed at compile time.
- **URL Format**: `https://cdn.teachlink.com/images/avatar.png?v=1.8.0`
- **Busting Policy**: Major or Minor application upgrades alter the version parameter, forcing the CDN edge caches and web browsers to immediately request the updated asset from the origin, while patch/non-disruptive builds leverage cached assets safely.

## 3. Caching Headers Specification

For versioned assets, we enforce aggressive 1-year caching to keep resources permanently stored at edge nodes and user devices.

- **Header**: `Cache-Control`
- **Directive**: `public, max-age=31536000, immutable`
  - `public`: Directs all proxy servers, browser clients, and intermediate caches to cache the response.
  - `max-age=31536000`: Cache the asset locally for exactly 1 year (31,536,000 seconds).
  - `immutable`: Tells browsers that the asset content will never change under this URL, completely bypassing conditional revalidation requests (`If-None-Match` / `304 Not Modified`) during page reload.

## 4. Hosting Configurations

We have pre-configured three major deployment environments at the project root to automatically append these headers to versioned static assets.

### A. Vercel (`vercel.json`)

```json
{
  "headers": [
    {
      "source": "/assets/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ]
}
```

### B. Netlify (`netlify.toml`)

```toml
[[headers]]
  for = "/assets/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"
```

### C. Firebase Hosting (`firebase.json`)

```json
{
  "hosting": {
    "public": "dist",
    "headers": [
      {
        "source": "/assets/**",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "public, max-age=31536000, immutable"
          }
        ]
      }
    ]
  }
}
```

---

## 5. Cloudflare & AWS CloudFront Configurations

### AWS S3 + CloudFront

1. **S3 Metadata**: Configure the S3 sync script to automatically inject metadata on static upload:
   `aws s3 sync dist/ s3://teachlink-bucket/ --cache-control "public, max-age=31536000, immutable"`
2. **CloudFront Behavior**: Create a Cache Behavior for `/assets/*` matching the origin:
   - **Minimum TTL**: `31536000`
   - **Maximum TTL**: `31536000`
   - **Default TTL**: `31536000`
   - **Query String Forwarding and Caching**: Cache based on selected query parameters (must include `v`).

### Cloudflare

1. **Cache Rules**: Create a Cache Rule under **Rules > Cache Rules**:
   - **Expression**: `(http.request.uri.path starts_with "/assets/")`
   - **Cache Eligibility**: Eligible for cache
   - **Edge Cache TTL**: Respect origin headers (preferred) or override with 1 year.
   - **Browser Cache TTL**: Respect origin headers or override with 1 year.
2. **Query String Customization**: Ensure "Query String Sort" is enabled to unify cache keys for unordered parameters.

---

## 6. Manual Verification Steps

### A. Command-line Verification (curl)

To verify that the CDN caching headers are correctly applied, run:

```bash
curl -I -s "https://cdn.teachlink.com/fonts/Inter-Regular.ttf?v=1.8.0"
```

Ensure that the response contains:

```http
HTTP/2 200
cache-control: public, max-age=31536000, immutable
x-cache: Hit from cloudfront (or equivalent CDN HIT header)
```

### B. Browser DevTools Verification

1. Open the browser DevTools (F12) and select the **Network** tab.
2. Check the **Disable Cache** box (to inspect initial delivery) and reload the page.
3. Select any font/image under `assets/` and check the **Response Headers** to confirm `Cache-Control`.
4. Uncheck **Disable Cache** and reload. The asset status should read `Status: 200 OK (from disk cache)` or `Status: 200 OK (from memory cache)` with **no** outgoing network request to the CDN server.

---

## 7. Performance & Health Monitoring

To ensure our global asset delivery is operating optimally, monitor these metrics:

1. **Cache Hit Ratio (CHR)**: Target CHR >= 95% for static assets under `/assets/*`. Keep track of edge eviction rates.
2. **Core Web Vitals (LCP & CLS)**: Aggressive caching of images (LCP candidate) and fonts (prevents Flash of Unstyled Text which causes CLS) directly impacts these vitals. Monitor them via Lighthouse audits or Real User Monitoring (RUM).
3. **Time to First Byte (TTFB)**: Track CDN response latency worldwide to ensure edge servers are warm.
