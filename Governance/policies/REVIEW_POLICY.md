# Code Review Policy

## Purpose

This policy defines what a TeachLink Mobile change must satisfy before it is
merged, who may approve it, and what a reviewer is expected to examine. It makes
review outcomes consistent and auditable, and it treats the repository's existing
quality gates in [Contributing](../../CONTRIBUTING.md) and the workflows under
`.github/workflows/` as authoritative rather than restating them.

## Scope

This policy applies to every pull request against the default branch: application
code, tests, configuration, CI workflows, and `Governance/` documents. Where
[Contributing](../../CONTRIBUTING.md) already states a rule, this policy requires
reviewers to enforce it rather than repeat it.

## Requirements Before Merge

A pull request is mergeable only when all of the following are true:

- The [pull request template](../../.github/pull_request_template.md) is completed:
  summary, type of change, testing done, security considerations, performance
  considerations, and the checklist.
- Every required check on the head commit is green. The `ci` job in
  [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml) runs the `console.*`
  scan, `Lint`, the lint-budget ratchet, `Format check`, `Typecheck`, `Test`,
  `Validate OpenAPI Spec`, the contract tests, the web export, the bundle-size
  check, and the API-performance check. The `Dependency boundaries` job in
  `.github/workflows/architecture.yml` and the `npm audit + depcheck + license` job
  in `.github/workflows/audit.yml` are required as well. The `test-e2e` job is
  required whenever it runs; it is skipped when the EAS and Maestro secrets are
  absent.
- At least one approval comes from a reviewer who is independent of the author, as
  defined in [Reviewer Independence](#reviewer-independence).
- Every blocking review comment is resolved, or explicitly deferred with the
  deferral recorded in the pull request thread.
- Every commit carries a valid `Signed-off-by` line, as required by the
  [Contributor and Release Sign-off Policy](CONTRIBUTOR_SIGNOFF.md).
- Documentation is updated with the change, and an architectural change has an ADR
  under `docs/adr/` linked from the pull request.
- A `Governance/` pull request touches only that folder and at most two files, as
  stated in [Governance](../README.md).

Contributors should run the same checks locally before pushing:

```
npm run lint
npm run lint:budget
npm run format:check
npm run typecheck
npm test
npm run architecture:check
```

The Husky `pre-commit` and `pre-push` hooks run a subset of these, but passing them
does not replace a green CI run.

## Reviewer Independence

- A reviewer must not be the author and must not have materially contributed to the
  change. Editing the branch, pairing on the implementation, or co-authoring commits
  counts as material contribution.
- An author never approves or merges their own pull request, including for
  `Governance/` documents.
- At least one approval must come from a reviewer with no involvement in the change.
- The following changes require two independent approvals:
  - authentication, session, and token storage;
  - payments and financial flows;
  - cryptography, app-signing keys, and secret handling;
  - deep-link and URL handling;
  - security fixes — the
    [Vulnerability Disclosure Process](../processes/VULN_DISCLOSURE.md) also requires
    a maintainer who is not the sole author;
  - release and build configuration, including `eas.json`, `app.config.ts`, and
    `.github/workflows/`;
  - dependency additions that include native code;
  - data migrations or changes to persisted formats.
- A reviewer who has a conflict of interest discloses it and recuses. If no
  independent reviewer is available, the matter is escalated to the maintainers
  instead of the rule being waived, and the reason is recorded in the pull request.
- When independence cannot be met, the compensating approval and the reason are
  recorded in the pull request.

## Review Scope

A reviewer examines the whole change, not only the lines that were edited:

- **Correctness** — the change does what the linked issue asks, handles failure and
  edge cases, and does not break existing behavior.
- **Tests** — the suite passes; new behavior has coverage; regression tests are added
  where applicable; tests assert behavior rather than implementation detail.
- **Architecture and boundaries** — `npm run architecture:check` passes; the change
  follows [Architecture](../../docs/ARCHITECTURE.md) and reuses the canonical
  implementation for error handling, logging, location, course progress, sync
  conflict resolution, and feature flags instead of duplicating it.
- **Security** — the security section of the pull request template is answered
  truthfully: secure storage of sensitive data, token handling, input validation, and
  deep-link safety.
- **Performance** — hooks are used appropriately, lists are optimized, async effects
  clean up after themselves, and the budgets in `performance-budget.json` and
  `performance-baseline.json` are respected.
- **Logging** — no `console.*` in `src/`; use `src/utils/logger`, as described in
  [Contributing](../../CONTRIBUTING.md).
- **Style and format** — ESLint and Prettier pass; the `lint-budget.json` ceiling may
  only ratchet down, never up.
- **Scope** — the diff is minimal and focused, with no unrelated refactoring,
  reformatting, or dependency bumps.
- **Documentation and release** — documentation, the changelog, and version metadata
  are updated when the change affects them, per the
  [Versioning Policy](VERSIONING.md) and [Changelog Policy](CHANGELOG_POLICY.md).
- **Dependencies** — `npm run audit`, `npm run depcheck`, and `npm run license:check`
  pass for dependency changes.

## Review Outcomes and Re-review

- Reviewers use **Approve**, **Request changes** (a blocking comment), or
  **Comment** (non-blocking). A blocking comment names the required change and is not
  buried in a general comment.
- An approval is tied to the commit it reviewed. After substantive new commits the
  approval is stale and a fresh review is required; a trivial rebase or a
  formatting-only update does not invalidate it.
- A reviewer who requested changes dismisses their review once satisfied, or another
  maintainer may do so with a recorded reason.
- Disagreement about a review outcome is handled through the
  [Objection Handling Process](../processes/OBJECTION_HANDLING.md), not by merging
  over an unresolved blocking comment.
- Maintainers merge a pull request once the requirements above are met. Emergency
  fixes that block a release follow
  [Release Cadence](../processes/RELEASE_CADENCE.md).

## Ownership

The maintainers own this policy and review it whenever the required checks in
`.github/workflows/` change.

Changes to this policy are proposed in a pull request that touches only the
`Governance/` folder.

## Success

This policy succeeds when every merged change was reviewed by someone independent
of its author, the required checks were green, and the review expectations were
clear enough that disagreements are rare and short.
