# App Store Release Governance Policy

## Purpose

This policy governs the release of TeachLink Mobile to the Apple App Store and Google Play Store, ensuring consistent quality, compliance, and rollback capability for every production release.

## Scope

Applies to all production releases of TeachLink Mobile on:
- Apple App Store (iOS/iPadOS)
- Google Play Store (Android)

Excludes: Internal/test builds, TestFlight/Play Console internal testing, CI artifacts.

## Submission Checklist

### Pre-Submission (T-3 days before release)

| Item | Owner | Verification |
|------|-------|--------------|
| **Version bumped** | Release Manager | `package.json` + native configs match; follows `Governance/policies/VERSIONING.md` |
| **CHANGELOG updated** | Release Manager + Docs Lead | User-facing changes documented per `Governance/policies/CHANGELOG_POLICY.md` |
| **Release notes finalized** | Docs Lead | User-facing + developer-facing separated; migration guide if breaking |
| **All CI passing** | Committers | Tests, lint, typecheck, build, security scan (Dependabot clean) |
| **No critical/P0 bugs open** | Release Manager | GitHub issue query confirms |
| **Security scan clean** | Security Officer | SAST/DAST/dependency scan; no critical findings |
| **Performance baseline met** | Release Manager | Automated benchmarks within 5% of prior release |
| **Accessibility audit** | Docs Lead | No regressions; WCAG 2.1 AA for new UI |
| **Store assets ready** | Community Manager | Screenshots, descriptions, privacy policy URL, support URL |
| **Privacy policy current** | Community Manager | Links to latest; reflects current data practices |
| **Export compliance** | Release Manager | ECCN/CCATS if crypto used; `ITSAppUsesNonExemptEncryption` set correctly |

### iOS App Store Specific

| Item | Verification |
|------|--------------|
| **Bundle ID matches** | `com.teachlink.mobile` (or configured) |
| **Provisioning profiles valid** | Distribution profile not expired; includes all entitlements |
| **App Store Connect metadata** | Version, build number, release notes, age rating, category, keywords |
| **TestFlight beta tested** | At least 1 RC build distributed to internal testers; no crash reports |
| **App Review Guidelines compliance** | No private APIs; proper permission usage strings; no placeholder content |
| **Export compliance** | `ITSAppUsesNonExemptEncryption` = YES/NO correctly; CCATS if required |
| **SKAdNetwork IDs declared** | If using ad attribution |

### Android Play Store Specific

| Item | Verification |
|------|--------------|
| **Package name matches** | `com.teachlink.mobile` (or configured) |
| **Signing key** | Release keystore available; Play App Signing enrolled |
| **Play Console metadata** | Version code/name, release notes, target audience, content rating |
| **Internal testing track** | At least 1 RC build tested; no ANRs/crashes |
| **Target API level** | Meets Google Play minimum (currently API 34+) |
| **Permissions justified** | All `uses-permission` have user-visible rationale |
| **Data safety form** | Completed in Play Console; matches privacy policy |
| **App Bundle (.aab)** | Built and uploaded; not legacy APK |

## Reviewer Sign-Off

### Required Approvals (All Required)

| Role | Approves |
|------|----------|
| **Release Manager** | Overall release readiness; checklist complete |
| **Security Officer** | Security scan clean; no critical vulnerabilities; crypto compliance |
| **Maintainer (1+)** | Release scope appropriate; no unapproved features merged |

### Sign-Off Process

1. Release Manager creates "Release Sign-Off" GitHub issue with checklist
2. Each reviewer comments `APPROVED` or `BLOCKED: <reason>`
3. All approvals → Release Manager tags release, triggers production build
4. Any block → Release Manager resolves or escalates per `Governance/policies/ESCALATION_PATH.md`

## Rollback Plan

### Trigger Conditions

- Critical crash rate > 1% of sessions within 2 hours
- Data loss/corruption reports
- Security vulnerability in released build
- Store rejection after release (policy violation discovered post-release)
- Critical functionality broken for > 5% users

### Rollback Procedure

1. **Release Manager** declares rollback incident in `#incidents` channel
2. **Immediate actions** (within 15 minutes):
   - Halt rollout (Play Console: halt rollout; App Store: remove from sale)
   - Post user-facing notice (Community Manager)
3. **Within 1 hour**:
   - Identify root cause (Maintainers + Security Officer if security)
   - Prepare hotfix or previous-version re-release
   - Hotfix sign-off: Release Manager + Security Officer (if security) + Maintainer
4. **Within 4 hours**:
   - Hotfix build submitted to stores (expedited review requested)
   - Rollback communicated to users with timeline
5. **Post-rollback** (within 48 hours):
   - Blameless postmortem
   - Process improvement items tracked

### Rollback Artifacts

| Artifact | Retention |
|----------|-----------|
| **Previous version build** | Kept in CI/CD artifacts for 90 days |
| **Database migration scripts** | Down migrations maintained for 2 releases |
| **Feature flags** | Critical features behind flags for instant disable |

## Post-Release Monitoring (T+7 days)

| Metric | Threshold | Action |
|--------|-----------|--------|
| **Crash-free sessions** | < 99.5% | Investigate; hotfix if regression |
| **ANR rate (Android)** | > 0.5% | Investigate |
| **App Store rating drop** | > 0.5 stars | Investigate reviews |
| **Support ticket volume** | > 2x baseline | Triage; communicate known issues |
| **Performance (TTI, memory)** | > 10% regression | Profile; schedule fix |

## Compliance & Audit

- **Audit trail**: All checklists, approvals, and rollback decisions recorded in GitHub issues
- **Retention**: Release records kept for 3 years
- **Policy review**: Annual review by Release Manager + Maintainers; updates via PR

## Related Documents

- Release Manager role: `Governance/roles/RELEASE_MANAGER.md`
- Release cadence: `Governance/processes/RELEASE_CADENCE.md`
- Release checklist template: `Governance/templates/RELEASE_CHECKLIST.md`
- Versioning policy: `Governance/policies/VERSIONING.md`
- Changelog policy: `Governance/policies/CHANGELOG_POLICY.md`
- Escalation path: `Governance/processes/ESCALATION_PATH.md`
- Security severity rubric: `Governance/SECURITY_SEVERITY_RUBRIC.md`