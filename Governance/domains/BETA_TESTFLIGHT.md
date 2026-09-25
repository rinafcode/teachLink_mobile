# Beta and TestFlight Governance

## Purpose

This document defines the controlled governance for beta and TestFlight release
activity in TeachLink Mobile. It ensures that pre-production builds are reviewed,
that feedback is triaged consistently, and that production promotion occurs only
when the release is ready for a broader audience.

## Scope

This policy covers:

- public or internal beta builds;
- Apple TestFlight distribution;
- tester onboarding and access control;
- feedback collection and issue triage;
- promotion gates for moving from beta to production;
- rollback or stop-ship decisions for release-blocking issues.

## Roles and Ownership

- The release manager owns the beta and TestFlight pipeline, distribution lists,
  and release sign-off.
- Maintainers and QA owners validate the candidate build and confirm feature,
  quality, and regression readiness.
- Contributors must record known limitations, risks, and test coverage in the
  release notes or the pull request used to ship the candidate build.
- Security and privacy owners review any issue involving data exposure,
  authentication, consent, or sensitive user information.

## Tester Onboarding

- Testers are invited only by the maintainers or release manager using the
  approved TestFlight link or a documented internal distribution method.
- A tester must be a valid, accountable participant, and their enrollment must be
  logged with the associated build, version, and onboarding date.
- Each tester receives a short brief that includes the target audience, the build
  version, the expected test scope, and the feedback deadline or review window.
- Testers are required to provide structured feedback, including reproduction
  steps, affected functionality, observed behavior, app version, device model, and
  operating system version.
- Access is removed when a tester is no longer active, no longer needs access, or
  violates the project’s policies or testing expectations.
- Testers must not redistribute the app, screenshots, or internal build artifacts
  outside the approved feedback channel.

## Build Eligibility and Distribution

A beta build may be distributed only when the following conditions are met:

1. The changelog and release notes are updated for the candidate version.
2. The build corresponds to the reviewed commit and correct version metadata.
3. Required validation has been completed for the affected areas of the app.
4. The known-issues list is documented and communicated to testers.
5. The release manager confirms the intended distribution audience and duration.

Beta builds are treated as controlled validation artifacts, not as production
releases, and they must be clearly labelled as such in the release notes,
distribution channel, and any public-facing communications.

## Feedback Triage

All tester feedback must be collected in a single, reviewable channel and triaged
with consistent severity labels.

### Severity Levels

- Severity 1: production-blocking issue or a data, security, or app-crash issue
  that prevents safe use.
- Severity 2: high-impact issue that materially affects core functionality,
  workflow completion, or user trust.
- Severity 3: medium-impact issue with a workaround or limited user impact.
- Severity 4: low-impact enhancement, cosmetic problem, or minor usability issue.

### Triage Workflow

1. Feedback is acknowledged within one business day when possible.
2. A maintainer assigns a severity and identifies the owner for investigation.
3. The issue is classified as bug, regression, usability, privacy/security,
   or feature request.
4. The team decides whether the issue blocks the current beta, requires a fix,
   or is accepted as a known limitation.
5. The tester receives a response that confirms the triage decision or requests
   more information.

Critical issues, especially those involving security, privacy, authentication,
crash loops, or data loss, stop the current beta release until the issue is
resolved or clearly accepted as an intentional risk.

## Promotion Criteria to Production

A beta or TestFlight build may be promoted to production only when all of the
following are true:

- No unresolved Severity 1 or Severity 2 issues remain for the target release.
- All required regressions and release-affecting flows were re-tested or have a
  documented, approved exception.
- The final production build matches the reviewed and approved release candidate.
- Store metadata, versioning, signing, and privacy requirements are verified.
- The release notes, rollback plan, and owner sign-off are complete.
- The release manager documents the final approval decision and the commit or
  artifact that was promoted.

If the release is not ready, the team keeps the build in beta or rejects the
promotion until the necessary quality gate is cleared.

## Rollback and Stop-Ship Policy

- A beta or production release is stopped immediately when a critical issue is
  discovered and cannot be safely mitigated.
- A rollback can be triggered by a crash, data integrity issue, authentication
  failure, security issue, or severe user-impacting regression.
- Rollbacks are documented with the reason, the affected build, the mitigation,
  and the follow-up action.
- No release is considered complete until the release owner confirms the post-rollout
  monitoring and communication plan.

## Documentation and Review

This document is maintained by the release-management and maintainership group.
Changes are proposed through a pull request that touches only the `Governance/`
folder and must explain the release or process impact.

## Success

This governance succeeds when beta builds are invited and validated in a visible,
traceable way; tester feedback is acted on quickly; production promotion remains
evidence-based; and release decisions are documented clearly for maintainers and
contributors.
