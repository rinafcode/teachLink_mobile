# Governance

This folder holds the **governance** of this TeachLink repository: the documents,
policies, roles, and processes that define how the project is run, how decisions
are made, and how contributors participate.

Everything in `Governance/` is documentation and policy. It is self-contained:
changes to governance are made **only** inside this folder and do not affect
application code.

## Purpose

- Make the project's decision-making transparent and predictable.
- Define clear roles, responsibilities, and expectations for contributors and maintainers.
- Give the community a single, versioned home for policies (contribution, conduct,
  security disclosure, releases, licensing, and on-chain/community governance).

## Structure

The governance documents are organised into the following areas. Individual
documents are added and refined over time (tracked as issues):

- **Foundations** — charter, mission, values, principles, and glossary.
- **Roles & membership** — contributor ladder, maintainer/reviewer roles, and the
  onboarding/offboarding lifecycle.
- **Decision-making** — consensus and voting rules, the RFC/proposal process, and
  decision records.
- **Community & conduct** — code of conduct, enforcement, moderation, and conflict
  resolution.
- **Contribution governance** — review policy, triage, labels, and roadmap governance.
- **Security & disclosure** — vulnerability reporting, embargo, and advisory processes.
- **Releases & change** — versioning, release cadence, deprecation, change policy, and
  OS version support (minimum versions, drop criteria, and notice period — see
  [`domains/OS_VERSION_SUPPORT.md`](domains/OS_VERSION_SUPPORT.md)).
- **Legal & IP** — licensing, contributor sign-off, trademark, and attribution.
- **Community & on-chain governance** — treasury, grants, and proposal governance.

## Domain documents

Domain-specific policies live in `Governance/domains/`. Each document is
self-contained and versioned with the repository:

- `domains/APP_REVIEW_COMPLIANCE.md` — store guideline checklist, pre-submission
  review, and rejection handling for app store submissions.
- `domains/APP_VERSION_BUMP.md` — build-number and version-name rules.
- `domains/BACKGROUND_TASK_GOVERNANCE.md` — background task ownership and limits.
- `domains/BIOMETRIC_AUTH.md` — biometric authentication requirements.
- `domains/DEVICE_SUPPORT.md` — supported device tiers and testing matrix.
- `domains/EAS_BUILD_GOVERNANCE.md` — EAS build profiles, secrets, and promotion.
- `domains/MOBILE_ACCESSIBILITY.md` — accessibility targets and merge gate.
- `domains/MOBILE_FEATURE_FLAGS.md` — feature-flag lifecycle and ownership.
- `domains/MOBILE_TELEMETRY.md` — telemetry consent, PII exclusion, and crash reports.
- `domains/STORYBOOK_GOVERNANCE.md` — Storybook usage and maintenance.

## Contributing to governance

Proposals to add or change governance are made by opening an issue or a pull
request that touches **only** this `Governance/` folder. Keep changes small and
focused (at most two files), and document what changed.
