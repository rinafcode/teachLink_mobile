# Issue Triage Process

## Purpose

This document defines how incoming issues are evaluated, classified, and routed
in the TeachLink Mobile project. A consistent triage process ensures that every
reported problem or request receives timely attention, is assigned the right
priority, and reaches the right contributor without unnecessary delay.

## Scope

Triage applies to all issues opened in the TeachLink Mobile repository, including
bug reports, feature requests, documentation improvements, and governance
proposals. Pull requests follow the review policy documented separately; this
process covers issue management only.

Security vulnerabilities must be reported through the channel defined in
`Governance/processes/VULN_DISCLOSURE.md` and are not triaged publicly.

## Required Labels

Every issue must carry at least one label from each of the following groups before
it is considered triaged.

### Type

| Label | When to apply |
|---|---|
| `type: bug` | Confirmed or highly probable defect in existing behaviour |
| `type: feature` | Request to add new capability |
| `type: docs` | Change to documentation or governance only |
| `type: chore` | Dependency updates, tooling, CI, or refactors with no user-visible change |
| `type: question` | Usage question; may be converted to a doc issue |

### Priority

| Label | Meaning |
|---|---|
| `priority: critical` | Data loss, security exposure, or complete blocker for all users |
| `priority: high` | Major functionality broken, no reasonable workaround |
| `priority: medium` | Meaningful impact; workaround exists |
| `priority: low` | Nice to have; impact is minor or affects very few users |

### Status

| Label | Meaning |
|---|---|
| `status: needs-info` | More information is required from the reporter |
| `status: confirmed` | Reproduced or validated; ready for work |
| `status: accepted` | Feature or doc request accepted into the backlog |
| `status: duplicate` | Resolved by linking to the canonical issue |
| `status: wont-fix` | Out of scope or intentional behaviour; closed with explanation |

## Triage Cadence

A triage session is held every Monday. In each session the triager reviews all
issues opened or updated since the previous session. The session is conducted
asynchronously in the repository; there is no required synchronous meeting. The
triager records any decisions that are not self-evident from the applied labels as
a comment on the relevant issue.

Issues labelled `priority: critical` are reviewed within one business day of
being opened, regardless of the weekly cadence.

## Triage Steps

The following steps are performed for each untriaged issue, in order.

1. **Confirm completeness.** Check that the issue provides enough context to act
   on. If information is missing, add `status: needs-info`, post a comment
   explaining exactly what is needed, and stop further triage until the reporter
   responds.

2. **Check for duplicates.** Search open and recently closed issues for the same
   root cause. If a duplicate is found, add `status: duplicate`, link to the
   canonical issue, and close the new issue.

3. **Assign a type label.** Apply one label from the Type group above.

4. **Reproduce or validate.**
   - For bugs: attempt to reproduce against the current `main` branch. If
     confirmed, proceed. If not reproducible, add `status: needs-info` and ask
     for steps or environment details.
   - For features and doc requests: assess whether the request aligns with the
     project scope and roadmap.

5. **Assign a priority label.** Apply one label from the Priority group.

6. **Set status.** Apply `status: confirmed` or `status: accepted` once the
   issue is validated, or `status: wont-fix` if it is out of scope.

7. **Assign a milestone (optional).** Link the issue to an upcoming release
   milestone if the fix or feature is targeted for a specific train.

8. **Assign or mention a contributor (optional).** If an area owner or willing
   contributor is known, @-mention them in a comment or assign the issue.

## Roles and Responsibilities

### Triager

A triager is any maintainer or reviewer performing a triage session. The triager
applies labels, posts clarifying questions, identifies duplicates, and links
related issues. The triager does not need to fix or implement the issue; the goal
is classification and routing.

### Reporter

The reporter is responsible for providing a clear description, reproducible steps,
and the information requested under `status: needs-info`. An issue with no
response to a needs-info request for 14 days may be closed with a note that it
can be reopened once information is available.

### Maintainer Group

The maintainer group may override a priority or status label when new information
warrants a change. Overrides are recorded as a comment explaining the reason.

## Ownership

The maintainer group owns this process. Changes are proposed in a pull request
that touches only the `Governance/` folder. The process is reviewed at least
once per quarter or when the triage backlog consistently exceeds two sessions.

## Success

This process succeeds when every issue is triaged within seven days of opening,
reporters receive timely and helpful responses, and contributors can pick up
`status: confirmed` issues without additional context gathering.
