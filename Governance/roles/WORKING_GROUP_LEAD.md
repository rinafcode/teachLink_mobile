# Working Group Lead Role

## Purpose

The Working Group Lead (WGL) is responsible for organizing and driving a focused, time-boxed initiative within TeachLink Mobile. Working groups address specific technical, operational, or community challenges that require cross-functional coordination.

## Responsibilities

### Charter & Planning
- **Draft charter**: Define the working group's mission, scope, deliverables, timeline, and success criteria.
- **Recruit members**: Identify and invite contributors with relevant expertise; maintain a public roster.
- **Set cadence**: Establish meeting schedule, communication channels, and decision-making process.
- **Risk assessment**: Identify dependencies, blockers, and mitigation strategies upfront.

### Execution
- **Drive progress**: Ensure the working group makes measurable progress toward deliverables.
- **Facilitate decisions**: Run structured discussions; document decisions and rationale.
- **Coordinate cross-functionally**: Liaise with Maintainers, Security Officer, Release Manager, and other roles as needed.
- **Unblock issues**: Escalate blockers via the ESCALATION_PATH.md process.

### Reporting & Accountability
- **Status reports**: Submit written status updates to Maintainers **bi-weekly** (every 2 weeks) including:
  - Progress against milestones
  - Risks and blockers
  - Resource needs
  - Decision log
- **Transparent communication**: Post meeting notes and decisions in public channels (GitHub Discussions or Discourse).
- **Deliverable ownership**: Ensure all outputs (code, docs, policies, tools) meet project standards and pass review.

### Closure
- **Final report**: Submit a closure report summarizing outcomes, lessons learned, and follow-up items.
- **Handoff**: Transfer ongoing responsibilities to appropriate roles (Maintainers, Docs Lead, etc.).
- **Archive**: Ensure all artifacts are archived in the governance repository.

## Reporting Cadence

| Frequency | Artifact | Audience |
|-----------|----------|----------|
| **Bi-weekly** | Written status update | Maintainers, project community |
| **Monthly** | Sync meeting (optional) | Maintainers, WG members |
| **At milestones** | Deliverable review | Maintainers, reviewers |
| **On closure** | Final report + retrospective | Maintainers, project community |

## Selection Process

1. **Proposal**: Any contributor may propose a working group by opening a GitHub issue using the "Working Group Formation" template (see `Governance/processes/WORKING_GROUP_FORMATION.md`).
2. **Approval**: Maintainers approve the charter and appoint a Lead.
3. **Lead criteria**: The Lead should have:
   - Demonstrated ability to coordinate contributors
   - Relevant domain expertise for the working group's focus
   - Commitment to the working group's timeline
   - Good standing in the community (no CoC violations)
4. **Term**: The Lead serves for the duration of the working group (typically 3–6 months). Extensions require Maintainer approval.

## Authority & Limits

| Authority | Limit |
|-----------|-------|
| Convene meetings & set agenda | Cannot bind project resources without Maintainer approval |
| Request reviews from specific roles | Cannot mandate prioritization from Maintainers/Reviewers |
| Publish working group outputs (drafts) | Final outputs require Maintainer approval |
| Escalate blockers | Cannot override Maintainer decisions |
| Manage working group membership | Cannot grant governance roles outside the WG |

## Relationship to Other Roles

| Role | Interaction |
|------|-------------|
| **Maintainers** | Approve charter, receive reports, authorize resources |
| **Security Officer** | Consult on security-related working groups |
| **Release Manager** | Coordinate if WG outputs affect release |
| **Docs Lead** | Ensure WG documentation follows standards |
| **Community Manager** | Coordinate community-facing communications |

## Termination

A Working Group Lead may be replaced if:
- The working group is dissolved (mission complete or abandoned)
- The Lead requests to step down
- Maintainers lose confidence (consensus decision with 14-day notice)
- Code of Conduct violation

The working group continues with a new Lead appointed by Maintainers.

## Documentation

- Formation template: `.github/ISSUE_TEMPLATE/working-group-formation.yml`
- Charter template: `Governance/templates/WORKING_GROUP_CHARTER.md` (if exists)
- This document: `Governance/roles/WORKING_GROUP_LEAD.md`