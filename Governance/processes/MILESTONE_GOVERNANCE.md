# Milestone Governance

## Purpose

This document defines how milestones are created, managed, and closed in the TeachLink Mobile project. Milestones provide a structured way to group related issues and pull requests (PRs) for specific releases, initiatives, or objectives. Clear milestone governance ensures that contributors understand what work is targeted for each milestone and when milestones are completed.

## Scope

This governance applies to all milestones created in the TeachLink Mobile repository. Milestones are used to track release trains, feature initiatives, and strategic objectives. This document does not cover the release cadence itself (see `RELEASE_CADENCE.md`) but rather how milestones are defined and managed within that cadence.

## Milestone Creation

### When to Create a Milestone

A milestone should be created when:
- A new release train is initiated (per the two-week release cadence)
- A major feature initiative requires coordinated work across multiple contributors
- A strategic objective or theme needs tracking over multiple releases
- A specific deadline or target date exists for a set of related work

### Who Can Create Milestones

- **Release milestones**: Created by the release owner or release management team
- **Feature milestones**: Created by maintainers with approval from the maintainer group
- **Strategic milestones**: Created by the maintainer group after discussion and consensus

### Milestone Naming Convention

Milestones follow the pattern: `[type] [name] [version/date]`

Examples:
- `Release v1.17.0` (for release trains)
- `Feature Offline Mode` (for feature initiatives)
- `Q4 2026 Performance` (for strategic objectives)

### Required Milestone Metadata

When creating a milestone, the following information must be provided:

| Field | Description | Required |
|-------|-------------|----------|
| Title | Clear, descriptive name following naming convention | Yes |
| Description | Brief summary of the milestone's purpose and scope | Yes |
| Target Date | Expected completion or release date | Yes (for release milestones) |
| Entry Criteria | Conditions that must be met to include work in this milestone | Yes |
| Exit Criteria | Conditions that must be met to close the milestone | Yes |
| Owner | Person or role responsible for milestone completion | Yes |

## Entry Criteria

Entry criteria define when work can be added to a milestone. These criteria must be satisfied before an issue or PR is linked to the milestone.

### General Entry Criteria

All milestones must satisfy these criteria before work is assigned:
- The milestone exists and has a defined owner
- Entry and exit criteria are documented
- The milestone is not already closed

### Release Milestone Entry Criteria

For release milestones (e.g., `Release v1.17.0`):
- The release issue for the train has been opened
- The target promotion date is set
- The release owner has been assigned
- The integration window is open (not in freeze)

### Feature Milestone Entry Criteria

For feature milestones (e.g., `Feature Offline Mode`):
- The feature has been accepted by the maintainer group
- A design document or RFC exists (if applicable)
- A technical owner has been identified
- The scope is reasonably bounded and achievable

### Strategic Milestone Entry Criteria

For strategic milestones (e.g., `Q4 2026 Performance`):
- The objective has been approved by the maintainer group
- Success metrics are defined
- A timeline with checkpoints is established
- Resource allocation is confirmed

## Exit Criteria

Exit criteria define when a milestone can be closed. These criteria must be met and verified before the milestone is marked complete.

### General Exit Criteria

All milestones must satisfy these criteria before closing:
- All linked issues are closed or moved to another milestone
- All linked PRs are merged or closed
- The milestone owner reviews and approves completion
- A summary of outcomes is documented

### Release Milestone Exit Criteria

For release milestones:
- All issues targeted for the release are resolved
- All PRs are merged and validated
- Release builds pass all checks (CI, beta testing, security scans)
- Release notes are complete and published
- The release has been promoted to the target channel
- Post-release monitoring plan is in place

### Feature Milestone Exit Criteria

For feature milestones:
- All feature requirements are implemented
- Feature is tested and documented
- Feature is enabled or released to users
- Success metrics are measured and reported
- Retrospective findings are recorded

### Strategic Milestone Exit Criteria

For strategic milestones:
- All defined objectives are achieved or documented as deferred
- Success metrics are evaluated and reported
- Lessons learned are captured
- Follow-up actions or next milestones are identified

## Milestone Lifecycle

### Active Phase

- Work is actively being added and completed
- Entry criteria are enforced for new additions
- Progress is tracked by the milestone owner
- Regular updates are provided to the team

### Review Phase

- No new work is added unless approved by milestone owner
- Exit criteria are evaluated
- Outstanding work is identified and addressed
- The milestone owner prepares a completion summary

### Closed Phase

- Milestone is marked complete
- Summary is documented in the milestone description or a linked issue
- Open issues are reassigned to appropriate milestones
- Retrospective is conducted (for significant milestones)

## Ownership and Responsibilities

### Milestone Owner

The milestone owner is responsible for:
- Defining and documenting entry and exit criteria
- Enforcing entry criteria when work is added
- Tracking progress and reporting status
- Coordinating with contributors to resolve blockers
- Verifying exit criteria before closing
- Documenting outcomes and lessons learned

### Release Owner (for Release Milestones)

The release owner has additional responsibilities:
- Managing the release train per `RELEASE_CADENCE.md`
- Coordinating with the release management team
- Handling release-specific communications and announcements
- Managing the freeze window and exceptions

### Maintainer Group

The maintainer group is responsible for:
- Approving creation of feature and strategic milestones
- Overseeing milestone governance and compliance
- Resolving disputes about milestone scope or criteria
- Reviewing and updating this governance document

## Milestone Modifications

### Changing Entry/Exit Criteria

Entry and exit criteria may be modified if:
- The milestone owner proposes the change
- The change is necessary due to unforeseen circumstances
- The maintainer group approves the change
- The change is documented with rationale

### Extending a Milestone

Milestones may be extended if:
- The milestone owner requests the extension
- Valid blockers or dependencies are identified
- The maintainer group approves the extension
- A new target date is set and communicated

### Closing a Milestone Early

A milestone may be closed early if:
- The objective is no longer relevant or aligned with project goals
- The milestone is superseded by a different initiative
- The maintainer group approves the early closure
- Linked work is reassigned appropriately

## Tracking and Reporting

### Progress Tracking

Milestone progress is tracked through:
- GitHub milestone progress (open/closed issues and PRs)
- Regular status updates in team meetings or communication channels
- Milestone owner reports at key checkpoints

### Reporting

Milestone owners provide updates:
- Weekly for active release milestones
- Bi-weekly for feature milestones
- Monthly for strategic milestones
- Ad-hoc when significant changes or blockers occur

## Governance Review

This milestone governance document is reviewed quarterly by the maintainer group. The review assesses:
- Whether milestones are being created and managed according to this process
- Whether entry and exit criteria are effective
- Whether the milestone lifecycle is being followed
- Whether any updates or improvements are needed

## Success

This milestone governance succeeds when:
- Milestones have clear, documented entry and exit criteria
- Contributors understand which milestones their work belongs to
- Milestone owners actively track and report progress
- Milestones are closed only when exit criteria are met
- The project has visibility into upcoming work and release timelines
- Milestone governance supports predictable delivery without adding overhead
