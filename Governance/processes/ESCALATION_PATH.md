# Escalation Path

## Purpose

This process defines how a stalled or disputed matter in TeachLink Mobile is raised
to the next level of the project, who owns each level, and how quickly a response is
expected. It gives contributors and maintainers one predictable route instead of
ad-hoc pinging, and it keeps decisions as close to the work as possible.

## Scope

This process applies to repository work: issues, pull requests, review
disagreements, CI results, and the interpretation of project governance. It does not
replace the process that owns a subject. Conduct, technical objections, security
reports, and release blockers each have a dedicated process, and this document routes
to them rather than duplicating their rules.

## Principles

- Resolve at the lowest tier that can act. Escalation is a request for a decision,
  not a complaint.
- Escalate one tier at a time, in writing, linking the issue, pull request, or CI
  run that shows the problem.
- Bring new evidence, not repetition. A tier decision stands unless material new
  information appears.
- Keep the thread public whenever the subject is not sensitive; the thread is the
  record.
- Never escalate a matter that another process already owns. Route it using
  [Matters That Escalate Elsewhere](#matters-that-escalate-elsewhere).

## Escalation Tiers

| Tier                                    | Contact                                                                                                                           | Response SLA     | Typical matters                                                                                                                             |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Change author and peers              | The pull request author and any contributor already active on the thread, reached by commenting and mentioning them with `@`.     | 2 business days  | Implementation detail, a failing check the author can fix, formatting and lint, missing tests, a request for a reproduction.                |
| 2. Reviewer or maintainer on the change | The maintainer who reviewed or was asked to review the change, reached by re-requesting review or commenting on the pull request. | 3 business days  | Disagreement about review scope or a blocking comment, a check that looks unrelated to the change, re-running a flaky job.                  |
| 3. Domain owner                         | The owner of the affected area, resolved as described in [Domain Contacts](#domain-contacts-tier-3).                              | 5 business days  | Architecture and dependency boundaries, security scope, performance budgets, accessibility, release and freeze questions, governance scope. |
| 4. Maintainer group                     | The maintainers collectively, reached through the issue or a `Governance/` proposal.                                              | 10 business days | Cross-domain conflicts, interpretation of a policy, a tier that repeatedly misses its SLA.                                                  |
| 5. Community lead                       | The project's community lead, the final internal reviewer.                                                                        | 15 business days | A final decision after tiers 1 to 4, or a matter that touches project direction.                                                            |

## Domain Contacts (Tier 3)

The repository keeps no separate private roster: each contact is resolved from the
artifact that records the work. Escalate by commenting on the issue or pull request
and naming the domain.

- **Architecture and dependency boundaries** — the owner of
  [Architecture](../../docs/ARCHITECTURE.md), whose boundaries are enforced by
  `npm run architecture:check` and the `Dependency boundaries` job in
  `.github/workflows/architecture.yml`.
- **Security** — the security lead, reached only through the private advisory
  channel (**Security > Report a vulnerability**), never through a public issue. See
  the [Vulnerability Disclosure Process](VULN_DISCLOSURE.md).
- **Release and distribution** — the release owner recorded in the active release
  issue. See [Release Cadence](RELEASE_CADENCE.md).
- **Performance and bundle size** — the owner of `performance-budget.json` and
  `performance-baseline.json`, checked by `.github/workflows/performance-regression.yml`
  and the `.github/workflows/bundle-size.yml` workflow.
- **Accessibility** — the owner of
  [Mobile Accessibility](../domains/MOBILE_ACCESSIBILITY.md).
- **Logging** — the owner of `src/utils/logger`, enforced by the `console.*` scan in
  `.github/workflows/ci.yml` and described in [Contributing](../../CONTRIBUTING.md).

## Response SLAs

- A response is the first substantive reply from the tier contact, not final
  resolution of the matter.
- SLAs are counted in business days, excluding weekends and project-recognised
  holidays. The clock starts when the escalation names the tier and links its
  evidence, and pauses while the escalating party owes an answer.
- If a tier cannot meet its SLA, it says so, names the next tier, and hands the
  matter over. Silence past the SLA is itself grounds to escalate one level.
- Security matters follow the [Security Severity Rubric](../SECURITY_SEVERITY_RUBRIC.md) —
  Critical acknowledged within 4 business hours, High within 1 business day, Medium
  within 3 business days, and Low within 5 business days — and the
  [embargo policy](../policies/EMBARGO.md). Those targets override this table for
  security scope.
- Release-blocking matters follow [Release Cadence](RELEASE_CADENCE.md) and may be
  handled inside the 48-hour candidate freeze by the release owner.

## Worked Examples in This Repository

- A pull request fails the `ci` job in `.github/workflows/ci.yml` at the
  `Typecheck`, `Lint`, `Format check`, or `Test` step. Tier 1 fixes it locally with
  `npm run typecheck`, `npm run lint`, `npm run format:check`, and `npm test`. If the
  contributor believes the failure is unrelated to their change, Tier 2 re-runs and
  decides.
- The `test-e2e` job fails in the E2E flow (EAS preview build, then Maestro). That
  job is skipped when the `MAESTRO_API_KEY` and `EXPO_TOKEN` secrets are absent, so
  a failure is first treated as possibly flaky. Tier 2 re-runs it; a persistent
  failure goes to Tier 3 for the affected flow.
- `npm run architecture:check` reports a dependency-cruiser boundary violation.
  Tier 2 decides whether the import is a mistake. If the direction change is
  intentional, the matter becomes a Tier 3 architecture decision and needs an ADR
  under `docs/adr/` before merge.
- A review comment is disputed, for example whether a change must use
  `src/utils/logger` instead of `console.*`, or whether duplicating a canonical
  module is a blocker. Tier 2 applies the
  [Objection Handling Process](OBJECTION_HANDLING.md).
- A change to token storage, deep-link handling, or payments has no reviewer
  independent of the author. Tier 3 assigns an independent reviewer, and for
  security scope the security lead decides.
- A `Governance/` pull request is contested or grows beyond the two-file scope set
  in [Governance](../README.md). Tier 3 reviews it against that folder's rules
  before Tier 4 decides.

## Matters That Escalate Elsewhere

- Interpersonal conflict, conduct, and conduct appeals — see
  [Conflict Resolution](CONFLICT_RESOLUTION.md).
- A technical objection to a decision — see
  [Objection Handling](OBJECTION_HANDLING.md).
- A suspected vulnerability — see the
  [Vulnerability Disclosure Process](VULN_DISCLOSURE.md).
- Embargo and coordinated disclosure — see the
  [Security Embargo Policy](../policies/EMBARGO.md).
- Severity levels and their SLAs — see the
  [Security Severity Rubric](../SECURITY_SEVERITY_RUBRIC.md).
- Release trains, freezes, and patch releases — see
  [Release Cadence](RELEASE_CADENCE.md).
- Inactive issues — see the [Stale Issue Policy](../policies/STALE_ISSUES.md).

## Ownership

The maintainers own this process and keep the tier contacts current as repository
roles change. The community lead and the maintainers review it annually, and after
any escalation that reaches Tier 4 or Tier 5.

Changes to this process are proposed in a pull request that touches only the
`Governance/` folder.

## Success

This process succeeds when a stalled matter reaches the right owner quickly, every
tier answers within its SLA or names the next, and few matters need to rise above
Tier 3.
