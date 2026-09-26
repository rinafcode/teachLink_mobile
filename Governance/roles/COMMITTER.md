# Committer Role

## Purpose

Committers are trusted contributors with the authority to merge approved pull requests into protected branches. They act as the final gatekeepers of code quality and project stability before changes reach users.

## Responsibilities

### Merge Authority
- **Merge approved PRs** into protected branches (`main`, `release/*`, `hotfix/*`)
- **Verify pre-merge checklist**:
  - All required reviews approved (per `Governance/policies/REVIEW_POLICY.md`)
  - CI/CD pipeline passing (tests, lint, typecheck, build)
  - No merge conflicts; branch up to date with base
  - CHANGELOG updated (if user-facing change)
  - Version bumped (if applicable per `Governance/policies/VERSIONING.md`)
- **Merge strategy**: Squash and merge (default); rebase for stacked PRs; merge commit for major features

### Quality Gatekeeping
- **Reject merges** that don't meet standards, even if approved:
  - Failing CI (flaky tests must be fixed, not ignored)
  - Missing CHANGELOG entry for user-facing changes
  - Unresolved review conversations
  - Versioning policy violations
- **Escalate disputes**: If reviewer/maintainer disagreement on merge readiness, escalate per `Governance/policies/ESCALATION_PATH.md`

### Release Support
- **Cut release branches** at Release Manager direction
- **Backport fixes** to `release/*` branches (cherry-pick with verification)
- **Tag releases** with signed tags (when Release Manager unavailable)

### Branch Protection
- **Enforce branch protection rules**: No force-push; required reviews; status checks
- **Maintain protected branch list**: `main`, `release/*`, `hotfix/*`, `stable/*`
- **Audit merge history** periodically for anomalies

## Merge Rights & Limits

| Right | Limit |
|-------|-------|
| **Merge to `main`** | Only after all required approvals + passing CI |
| **Merge to `release/*`** | Only at Release Manager direction; backports only |
| **Merge to `hotfix/*`** | Only for P0 security/production issues; Security Officer notification |
| **Merge to feature branches** | Unrestricted (own PRs); delegate to others with review |
| **Override failing CI** | **Never** — must fix CI first |
| **Override review requirements** | **Never** — must have required approvals |
| **Self-merge own PRs** | Only if another Committer/Maintainer reviewed and approved |

## Nomination Criteria

A Contributor/Reviewer may be nominated for Committer if they demonstrate:

| Criterion | Minimum Evidence |
|-----------|------------------|
| **Sustained contribution** | 6+ months active; 20+ merged PRs |
| **Code quality** | Consistently passes review without major rework |
| **Process adherence** | Follows branching, commit, CHANGELOG, versioning policies |
| **Review participation** | 30+ constructive reviews; helps others improve |
| **Reliability** | Responsive; meets SLA; communicates proactively |
| **Trust** | No CoC violations; respected by community |

## Selection Process

1. **Nomination**: Any Maintainer nominates via GitHub issue with evidence
2. **Discussion**: 14-day discussion period; community input welcome
3. **Assessment**: Maintainers evaluate against criteria; may request trial period
4. **Approval**: Maintainer consensus (no objections) or 2/3 majority vote
5. **Onboarding**: Added to `committers` team; receives merge guidelines, signing keys (if applicable), and tool access

## Relationship to Other Roles

| Role | Interaction |
|------|-------------|
| **Maintainers** | Maintainers are Committers + governance authority; can override Committer decisions |
| **Release Manager** | Directs release branch merges; Committers execute |
| **Reviewers** | Reviewers approve; Committers merge (separation of concerns) |
| **Security Officer** | Must notify before merging security-sensitive hotfixes |
| **Triagers** | Triagers route PRs; Committers merge approved ones |

## Removal

A Committer may be removed by Maintainer consensus for:
- **Inactivity**: No merges for 90+ days without notice
- **Process violations**: Bypassing CI, reviews, or CHANGELOG requirements
- **Quality lapses**: Merging PRs with known issues (after coaching)
- **CoC violations** or abuse of merge authority
- **Voluntary resignation**

Removed Committers retain Reviewer/Contributor status and may be re-nominated after 6 months.

## Recognition

- Listed in `Governance/RECOGNITION.md` and project website
- Committer badge on GitHub profile
- Included in release credits

## Documentation

- Review policy: `Governance/policies/REVIEW_POLICY.md`
- Versioning: `Governance/policies/VERSIONING.md`
- Changelog policy: `Governance/policies/CHANGELOG_POLICY.md`
- Escalation path: `Governance/policies/ESCALATION_PATH.md`
- This document: `Governance/roles/COMMITTER.md`