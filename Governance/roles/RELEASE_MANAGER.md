# Release Manager Role

## Purpose

The Release Manager (RM) owns the end-to-end release process for TeachLink Mobile, ensuring predictable, high-quality, and secure deliveries to users on iOS and Android.

## Responsibilities

### Release Planning & Cadence
- **Define release schedule**: Maintain `Governance/processes/RELEASE_CADENCE.md` (e.g., monthly minor, quarterly major, hotfix as needed)
- **Coordinate release windows**: Align with Maintainers, Security Officer, Docs Lead, Community Manager
- **Capacity planning**: Ensure features/fixes are sized for release windows; manage scope
- **Dependency management**: Track upstream deps (React Native, Expo, iOS/Android SDKs); plan upgrades

### Release Execution
- **Branch management**: Create `release/x.y` branches; enforce freeze policies
- **Build orchestration**: Trigger CI/CD (EAS, Fastlane, etc.); monitor builds; troubleshoot failures
- **Artifact management**: Sign builds (iOS/Android); upload to TestFlight, Play Console, GitHub Releases
- **Rollback readiness**: Maintain rollback plan per `Governance/domains/APP_STORE_RELEASE.md`

### Quality Gates
- **Pre-release checklist**: All tests pass; no critical bugs; security scan clean; performance baseline met
- **Beta/RC management**: Distribute to testers; collect feedback; gate promotion to production
- **Regression verification**: Automated + manual smoke tests on release candidates
- **Security sign-off**: Security Officer approval for releases with security fixes

### Communication & Documentation
- **Release notes**: Generate from CHANGELOG; separate user-facing vs. developer-facing
- **Migration guides**: For breaking changes (coordinate with Docs Lead)
- **Announcements**: Coordinate with Community Manager for blog, social, newsletter
- **Post-release retrospective**: Document lessons learned; update processes

### Release Sign-Off Authority

| Decision | Authority |
|----------|-----------|
| **Cut release branch** | RM (with Maintainer notification) |
| **Promote RC → Production** | RM + Maintainer consensus (no objections) |
| **Hotfix release** | RM + Security Officer (for security) / Maintainer (for critical bugs) |
| **Rollback production** | RM (immediate); Maintainer notification within 1 hour |
| **Delay release** | RM (with Maintainer notification); Maintainers can override delay |

## Rotation Process

- **Term**: 2 releases (typically 2 months), then rotate
- **Rotation schedule**: Published 3 months in advance
- **Incoming RM**: Shadows outgoing RM for 1 full release cycle before taking lead
- **Outgoing RM**: Remains available for consultation during next release
- **Emergency cover**: Maintainers designate backup RM for unexpected absences

### Rotation Eligibility
- **Committers** with 6+ months experience
- **Completed 1 shadow cycle** (observed full release)
- **Familiarity** with iOS/Android build pipelines, signing, store submission
- **Availability** during release windows (no extended leave planned)

## Release Process Reference

### Standard Release (Monthly Minor)
1. **T-14 days**: Release branch cut; feature freeze begins
2. **T-10 days**: RC1 built; beta testing starts
3. **T-7 days**: Bug fix window; only P0/P1 fixes accepted
4. **T-3 days**: RC final; security scan; performance baseline
5. **T-1 day**: Release sign-off (RM + Maintainers)
6. **Release day**: Production deploy; store submission; announcements
7. **T+7 days**: Post-release monitoring; retrospective

### Hotfix Release
1. **Trigger**: P0 security vulnerability or critical production bug
2. **Branch**: `hotfix/x.y.z` from latest `release/x.y` or `main`
3. **Fix**: Minimal, targeted change; expedited review
4. **Build & test**: Full CI + manual verification on devices
5. **Sign-off**: RM + Security Officer (security) / Maintainer (bug)
6. **Deploy**: Store expedited review; force-update if critical
7. **Backport**: Merge fix to `main` and active `release/*` branches

## Relationship to Other Roles

| Role | Interaction |
|------|-------------|
| **Maintainers** | Approve release scope; sign-off on RC→Production; override delays |
| **Security Officer** | Security scan sign-off; hotfix coordination; vulnerability disclosure timing |
| **Docs Lead** | Release notes, migration guides, versioned docs timing |
| **Community Manager** | Release announcements, blog posts, social media, newsletter |
| **Committers** | Execute merges to release branches; tag releases |
| **Working Group Leads** | Coordinate feature readiness for release windows |

## Release Artifacts

| Artifact | Owner | Timing |
|----------|-------|--------|
| **Release branch** | RM | T-14 days |
| **Release candidate builds** | CI/CD (RM monitors) | T-10 days |
| **Release notes** | RM + Docs Lead | T-3 days |
| **Migration guide** | Docs Lead | T-3 days (if breaking changes) |
| **Signed builds** | CI/CD (RM verifies) | Release day |
| **Store listings** | RM + Community Manager | Release day |
| **Post-release report** | RM | T+7 days |

## Documentation

- Release cadence: `Governance/processes/RELEASE_CADENCE.md`
- App Store release policy: `Governance/domains/APP_STORE_RELEASE.md`
- Release checklist: `Governance/templates/RELEASE_CHECKLIST.md`
- Versioning policy: `Governance/policies/VERSIONING.md`
- Changelog policy: `Governance/policies/CHANGELOG_POLICY.md`
- This document: `Governance/roles/RELEASE_MANAGER.md`