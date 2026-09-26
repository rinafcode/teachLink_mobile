# Reviewer Role

## Purpose

Reviewers ensure the quality, correctness, and maintainability of TeachLink Mobile by providing thorough, timely code and documentation reviews. They are trusted community members who help maintain project standards.

## Responsibilities

### Code Review
- **Review assigned PRs** within **3 business days** (SLA per `Governance/policies/REVIEW_SLA.md`)
- **Evaluate correctness**: Logic, edge cases, error handling, security implications
- **Check maintainability**: Code clarity, naming, modularity, test coverage
- **Verify standards**: Linting, formatting, architectural patterns, performance
- **Provide actionable feedback**: Specific, constructive, prioritized (blocking vs. suggestions)

### Documentation Review
- **Review docs PRs** for accuracy, clarity, completeness, and style
- **Verify examples** compile and run correctly
- **Check cross-references** and links

### Process
- **Self-assign** from review queue or accept assignment from Maintainers/Triagers
- **Use review templates** and checklists where available
- **Approve** when PR meets standards; **Request changes** with clear rationale when not
- **Escalate** complex/architectural decisions to Maintainers via `Governance/policies/ESCALATION_PATH.md`

## Review Expectations & Scope

| Area | Expectation |
|------|-------------|
| **Correctness** | Logic handles happy path + edge cases; no obvious bugs |
| **Tests** | New code has tests; existing tests pass; coverage maintained |
| **Security** | No secrets, injection risks, unsafe patterns; flag for Security Officer if unsure |
| **Performance** | No obvious regressions; flag algorithmic concerns |
| **Architecture** | Follows established patterns; no circular deps; proper layering |
| **Documentation** | Public APIs documented; complex logic commented; CHANGELOG updated |
| **Dependencies** | Minimal, justified, licensed compatibly; flag supply-chain risks |

### Out of Scope for Reviewers
- **Final merge decision**: Maintainers merge (or delegate to Committers)
- **Release decisions**: Release Manager owns release timing
- **Governance policy changes**: Maintainers approve
- **Security embargo decisions**: Security Officer leads

## How Reviewers Are Added

1. **Nomination**: Any Maintainer or Reviewer may nominate a Contributor who has:
   - **Minimum 5 merged PRs** demonstrating consistent quality
   - **At least 20 constructive reviews** on others' PRs
   - **Demonstrated knowledge** of codebase area(s)
   - **Good standing** (no CoC violations, respects review process)
2. **Discussion**: 7-day discussion period for community input
3. **Approval**: Maintainer consensus (no objections) or 2/3 Maintainer vote
4. **Onboarding**: New Reviewer added to `reviewers` team; receives review guidelines and tool access

## Reviewer Teams

Reviewers may be assigned to **specialized teams** based on expertise:
- **Core**: App architecture, state management, navigation
- **UI/UX**: Components, styling, accessibility, design system
- **Platform**: iOS/Android native modules, permissions, build config
- **Testing**: Test infrastructure, E2E, CI/CD
- **Documentation**: Docs, examples, tutorials
- **Security**: Security-sensitive changes (coordinated with Security Officer)

Reviewers can belong to multiple teams. Team membership is visible in GitHub.

## Review Load Management

- **Target**: 3–5 active reviews per Reviewer at a time
- **Rotation**: Reviewers may request temporary pause (vacation, burnout)
- **Reassignment**: Triagers/Maintainers reassign stale reviews (>5 days)

## Recognition

- Listed in `Governance/RECOGNITION.md` and project website
- Reviewer badge on GitHub profile
- Annual "Top Reviewer" recognition

## Removal

A Reviewer may be removed by Maintainer consensus for:
- **Inactivity**: No reviews for 90+ days without pause request
- **Quality concerns**: Consistently missing blocking issues (after coaching)
- **Process violations**: Ignoring SLA, bypassing process, CoC violations
- **Voluntary resignation**: Reviewer requests removal

Removed Reviewers retain Contributor status and may be re-nominated after 6 months.

## Documentation

- Review policy: `Governance/policies/REVIEW_POLICY.md`
- Review SLA: `Governance/policies/REVIEW_SLA.md`
- Escalation path: `Governance/policies/ESCALATION_PATH.md`
- This document: `Governance/roles/REVIEWER.md`