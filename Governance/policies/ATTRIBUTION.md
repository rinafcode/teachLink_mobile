# Attribution Policy

## Purpose

This policy defines when and how TeachLink Mobile requires attribution for third-party code, assets, and contributions. It ensures legal compliance, respects creator rights, and maintains project transparency.

## When Attribution Is Required

### 1. Third-Party Code & Libraries

**Always required** when incorporating:
- Open-source libraries (npm, CocoaPods, Maven, Pub, etc.)
- Copied/adapted code snippets from Stack Overflow, blogs, gists, other projects
- Forked or vendored dependencies
- Generated code from tools that require attribution (e.g., protocol buffers, GraphQL schemas)

### 2. Assets & Media

**Always required** for:
- Icons, images, illustrations, fonts, sounds, videos
- UI kits, design systems, component libraries
- Translations from external sources

### 3. Contributor Contributions

**Required** for:
- Significant code contributions (beyond trivial fixes)
- Original designs, documentation, translations
- Ideas/architectural decisions from RFCs/discussions

### 4. Data & Datasets

**Required** when using:
- Public datasets (educational standards, curriculum data, etc.)
- Pre-trained models, embeddings, tokenizers
- Third-party APIs/services

## Attribution Format

### Standard Format (NOTICE file)

All attributions are consolidated in `NOTICE` (root of repo) and `NOTICE.md` (docs). Format:

```
TeachLink Mobile
Copyright (c) 2024 TeachLink Mobile Contributors

This product includes software developed by the TeachLink Mobile Project
(https://github.com/rinafcode/teachLink_mobile).

---

Third-party components:

1. [Library Name] ([License])
   - Source: [URL]
   - Copyright: [Copyright holder] [Year(s)]
   - Modifications: [Brief description if modified]

2. [Asset Name] ([License])
   - Source: [URL]
   - Creator: [Name/Organization]
   - License: [License name + URL]

3. [Contributor Name] ([License if not project default])
   - Contribution: [Brief description]
   - GitHub: [@username]
```

### In-App Attribution

- **Settings → About → Legal/Attribution**: Full NOTICE content
- **Settings → About → Licenses**: Scrollable list of all third-party licenses
- **Settings → About → Contributors**: Link to CONTRIBUTORS.md

### Documentation Attribution

- Code examples: Inline comment with source if adapted from external source
- Tutorials: "Based on [source]" footer
- Translations: "Translated by [name] from [source language]"

## License Compatibility

### Accepted Licenses (Auto-Approved)

| License | SPDX ID | Notes |
|---------|---------|-------|
| MIT | `MIT` | Standard |
| Apache 2.0 | `Apache-2.0` | Patent grant |
| BSD 2-Clause | `BSD-2-Clause` | |
| BSD 3-Clause | `BSD-3-Clause` | |
| ISC | `ISC` | |
| Unicode (TOU) | `Unicode-TOU` | For Unicode data |
| CC0 | `CC0-1.0` | Public domain |
| CC-BY-4.0 | `CC-BY-4.0` | For assets/docs |

### Conditionally Accepted (Require Review)

| License | SPDX ID | Condition |
|---------|---------|-----------|
| LGPL-2.1+ | `LGPL-2.1-or-later` | Dynamic linking only; no static linking on iOS |
| MPL-2.0 | `MPL-2.0` | File-level copyleft; review file boundaries |
| EPL-2.0 | `EPL-2.0` | Similar to MPL; review |

### Prohibited Licenses (Require Exception)

| License | SPDX ID | Reason |
|---------|---------|--------|
| GPL-2.0/3.0 | `GPL-2.0-only`, `GPL-3.0-only` | Viral; incompatible with App Store distribution |
| AGPL | `AGPL-3.0-only` | Network copyleft; incompatible |
| SSPL | `SSPL-1.0` | Not OSI-approved; incompatible |
| Custom/Proprietary | N/A | Requires legal review |

*Exceptions require Treasurer + Security Officer + Maintainer unanimous consent.*

## Attribution Process

### For Dependencies (Automated)

1. **CI Pipeline**: `license-checker` or `oss-review-toolkit` runs on every PR
2. **Output**: Generates `NOTICE.generated` with all transitive deps
3. **Review**: Release Manager verifies no prohibited licenses
4. **Commit**: `NOTICE` updated in release branch

### For Manual Additions (Code/Assets/Translations)

1. **PR Author**: Adds entry to `NOTICE.md` in PR
2. **Reviewer**: Verifies format, license compatibility, completeness
3. **Merger**: Ensures `NOTICE` updated before merge

### For Contributor Attribution

- **Automatic**: GitHub contributors graph + `CONTRIBUTORS.md` (auto-generated)
- **Manual**: Significant non-code contributions (design, docs, ideas) added to `NOTICE.md` by maintainer merging the work

## Third-Party Notice Handling

### App Store / Play Store

- **iOS**: `Settings.bundle` includes `Acknowledgements.plist` (generated from NOTICE)
- **Android**: `licenses` menu item in app (generated from NOTICE)

### Distribution Packages

- **Source distribution**: Includes `NOTICE` and `LICENSE` files
- **Binary distribution**: In-app attribution screen accessible from Settings

### Documentation Site

- `/licenses` page: Full NOTICE content
- Each third-party lib linked to its repo/license

## Enforcement

| Violation | Consequence |
|-----------|-------------|
| Missing attribution in PR | PR blocked until added |
| Prohibited license introduced | PR blocked; exception process required |
| NOTICE out of date at release | Release blocked until updated |
| Repeated violations | Contributor coaching; maintainer escalation |

## Exception Process

For prohibited/conditional licenses:

1. **Request**: PR author opens issue with `license-exception` label
2. **Review**: Treasurer (financial/legal), Security Officer (supply chain), Maintainers
4. **Decision**: Unanimous consent required; documented in `Governance/license-exceptions.json`
5. **Record**: Exception recorded in NOTICE with rationale

## Maintenance

- **NOTICE audit**: Quarterly by Release Manager
- **License scan**: Automated in CI (every PR + nightly)
- **SPDX compliance**: Use SPDX identifiers; validate with `spdx-license-list`
- **Annual review**: Policy reviewed annually by Maintainers + Treasurer

## Related Documents

- License allowlist: `license-allowlist.json`
- License exceptions: `license-exceptions.json`
- License check config: `dependency-cruiser.config.js`
- This document: `Governance/policies/ATTRIBUTION.md`