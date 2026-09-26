# Working Group Formation Process

## Purpose

This document defines how working groups are proposed, approved, governed, and closed within TeachLink Mobile. Working groups are time-boxed, cross-functional teams that tackle specific initiatives requiring coordinated effort across multiple domains.

## When to Form a Working Group

Form a working group when an initiative meets **all** of these criteria:

- **Cross-functional**: Requires expertise from 2+ domains (e.g., mobile + backend + design + docs)
- **Time-boxed**: Clear start/end dates (typically 3–6 months)
- **Defined deliverables**: Concrete outputs (code, docs, policy, tooling)
- **Coordination needed**: Cannot be handled by existing roles/processes alone

**Do NOT form a working group for**:
- Single-person tasks → assign to individual
- Ongoing operations → assign to existing role (Reviewer, Triager, etc.)
- Pure research without delivery commitment → RFC process
- Features within a single domain → standard PR/review process

## Proposal Process

### 1. Draft Proposal

Any contributor may propose a working group by opening a GitHub issue using the "Working Group Proposal" template with:

| Field | Required | Description |
|-------|----------|-------------|
| **Title** | Yes | Clear, descriptive name (e.g., "Accessibility Audit Working Group") |
| **Mission** | Yes | One-sentence purpose statement |
| **Scope** | Yes | What's in/out of scope; boundaries |
| **Deliverables** | Yes | Concrete outputs with acceptance criteria |
| **Timeline** | Yes | Start date, milestones, end date (max 6 months) |
| **Team** | Yes | Proposed Lead + 3–8 members (roles, GitHub handles) |
| **Dependencies** | No | Other teams, external deps, budget needs |
| **Risks** | No | Technical, org, timeline risks + mitigations |
| **Success Metrics** | Yes | How we'll know it succeeded |

### 2. Community Discussion (14 days)

- Proposal posted with `working-group-proposal` label
- 14-day comment period for:
  - Questions/clarifications
  - Scope feedback
  - Volunteer interest (add self to team)
  - Concerns/objections
- Proposer updates proposal based on feedback

### 3. Approval

**Approval criteria**:
- **Mission alignment**: Supports core values (`Governance/VALUES.md`) and scope (`Governance/SCOPE.md`)
- **Feasibility**: Realistic timeline, team has capacity, dependencies manageable
- **Governance**: Clear lead, reporting cadence, closure plan

**Decision**:
- **Maintainer consensus** (no objections after discussion) → Approved
- **Objections raised** → 2/3 Maintainer majority vote
- **Rejected** → Proposer may revise and resubmit after 30 days

### 4. Charter & Launch

Upon approval:
1. **Charter created** from approved proposal (template: `Governance/templates/WORKING_GROUP_CHARTER.md`)
2. **Lead appointed** (added to `working-group-leads` team)
3. **Members confirmed** (added to working group GitHub team)
4. **Channels created**: GitHub project board, Discord/Slack channel, docs folder
5. **Announcement**: Posted in `#announcements`, GitHub Discussions, newsletter

## Working Group Governance

### Lead Responsibilities

Per `Governance/roles/WORKING_GROUP_LEAD.md`:
- Draft/execute charter; recruit members; set cadence
- Drive progress; facilitate decisions; coordinate cross-functionally
- **Bi-weekly status reports** to Maintainers (progress, risks, blockers, decisions)
- Ensure deliverables meet quality standards; coordinate handoff at closure

### Member Responsibilities

- Active participation (attend meetings, contribute to deliverables)
- Communicate blockers early; propose solutions
- Document work in shared spaces (GitHub, docs, board)
- Respect time-boxing; escalate scope changes early

### Decision Making

- **Consensus preferred**: Discuss until no strong objections
- **Fallback**: Lead decides after hearing all views (documented with rationale)
- **Escalation**: Deadlocks → Maintainers via `Governance/policies/ESCALATION_PATH.md`

### Reporting Cadence

| Frequency | Artifact | Audience |
|-----------|----------|----------|
| **Bi-weekly** | Written status update | Maintainers, community (GitHub Discussion) |
| **Monthly** | Sync meeting (optional) | Maintainers, WG members |
| **At milestones** | Deliverable review | Maintainers, reviewers |
| **On closure** | Final report + retrospective | Maintainers, community |

## Working Group Lifecycle

### 1. Formation (Week 0–1)
- Proposal → Discussion → Approval → Charter → Launch

### 2. Execution (Weeks 2–N)
- Weekly/bi-weekly syncs
- Bi-weekly written reports
- Milestone checkpoints with Maintainers
- Scope changes → Maintainer approval (if timeline/budget affected)

### 3. Closure (Final 2 weeks)
- Complete deliverables; ensure quality gates pass
- Handoff: Transfer ongoing responsibilities to owning roles
- **Final report**: Outcomes, metrics, lessons learned, follow-ups
- **Retrospective**: What worked, what didn't, process improvements
- Archive: Move docs to `Governance/archive/working-groups/`
- Celebrate! 🎉

### 4. Extension (If Needed)

- **Max 1 extension** (up to 50% of original timeline)
- Requires Maintainer approval with updated charter
- Justification: Scope discovery, unforeseen complexity, resource changes
- No extensions beyond 9 months total

## Working Group Types

| Type | Typical Duration | Example |
|------|------------------|---------|
| **Feature** | 3–4 months | "Offline Sync Redesign WG" |
| **Process** | 2–3 months | "Release Process Automation WG" |
| **Technical Debt** | 2–3 months | "Legacy Navigation Refactor WG" |
| **Policy/Compliance** | 2–3 months | "GDPR Audit WG" |
| **Community** | 2–4 months | "Mentorship Program WG" |
| **Research/Spike** | 1–2 months | "WASM Feasibility WG" |

## Template: Working Group Charter

```markdown
# Working Group Charter: [Name]

## Mission
[One-sentence mission statement]

## Scope
**In Scope**: [Bullet list]
**Out of Scope**: [Bullet list]

## Deliverables & Acceptance Criteria
| Deliverable | Criteria | Target Date |
|-------------|----------|-------------|
| [Name] | [Measurable criteria] | [Date] |

## Timeline
- **Start**: [Date]
- **Milestones**: [Dates + descriptions]
- **End**: [Date] (max 6 months from start)

## Team
| Role | Person | GitHub | Capacity (hrs/week) |
|------|--------|--------|---------------------|
| Lead | [Name] | @handle | [Hours] |
| Member | [Name] | @handle | [Hours] |

## Dependencies & Risks
| Dependency/Risk | Mitigation | Owner |
|-----------------|------------|-------|

## Reporting
- **Bi-weekly**: Written status to Maintainers
- **Monthly**: Sync meeting (optional)
- **At milestones**: Deliverable review

## Success Metrics
[Measurable outcomes defining success]

## Approval
- **Proposed by**: @handle
- **Approved by**: Maintainers (consensus/vote)
- **Date**: [Date]
```

## Related Documents

- Working Group Lead role: `Governance/roles/WORKING_GROUP_LEAD.md`
- Scope statement: `Governance/SCOPE.md`
- Core Values: `Governance/VALUES.md`
- Escalation path: `Governance/policies/ESCALATION_PATH.md`
- This document: `Governance/processes/WORKING_GROUP_FORMATION.md`