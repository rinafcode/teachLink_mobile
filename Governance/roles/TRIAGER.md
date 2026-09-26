# Issue Triager Role

## Purpose

Triagers are the first line of defense for TeachLink Mobile's issue queue. They ensure incoming issues are properly categorized, prioritized, and routed to the right people—keeping the issue tracker organized and actionable.

## Responsibilities

### Triage New Issues
- **Monitor** new issues across all TeachLink Mobile repositories (daily)
- **Categorize** using label taxonomy (`Governance/LABEL_TAXONOMY.md`):
  - **Type**: bug, feature, enhancement, documentation, question, chore
  - **Priority**: P0 (critical), P1 (high), P2 (medium), P3 (low)
  - **Area**: component/module labels (ui, core, platform, ci, docs, etc.)
  - **Status**: needs-triage, needs-repro, needs-design, ready-for-dev, blocked
- **Close invalid issues**: duplicates, not-reproducible, wontfix, out-of-scope (with explanation)
- **Request missing info**: reproduction steps, environment, logs, screenshots

### Enrich & Route
- **Add context**: Link related issues, PRs, docs, discussions
- **Assign** to appropriate Reviewer team or Maintainer based on area
- **Set milestones** for time-sensitive issues (releases, security, regressions)
- **Escalate** critical issues (P0, security, data loss) via `Governance/policies/ESCALATION_PATH.md`

### Maintain Queue Health
- **Stale issue management**: Apply `stale` label per `Governance/policies/STALE_ISSUES.md`; close after 30 days inactivity
- **Backlog grooming**: Monthly review of open issues; re-prioritize, close obsolete
- **Metrics**: Track triage throughput, time-to-first-response, closure rate

## Permissions Granted

| Permission | Scope |
|------------|-------|
| **Label management** | Add/remove all labels on issues/PRs |
| **Issue assignment** | Assign to any Contributor, Reviewer, Maintainer |
| **Milestone management** | Add/remove milestones on issues |
| **Close/reopen issues** | Close invalid/duplicate; reopen if mistakenly closed |
| **Issue locking** | Lock heated discussions (with Maintainer notification) |
| **Project board management** | Move issues on triage/backlog boards |

*Triagers do **not** have: merge rights, review approval authority, release permissions, or governance voting rights.*

## Promotion Path

Triager → Reviewer → Committer → Maintainer

| Step | Typical Requirements |
|------|----------------------|
| **Triager → Reviewer** | 3+ months active triaging; 20+ constructive reviews; codebase familiarity |
| **Reviewer → Committer** | See `Governance/roles/REVIEWER.md` and `COMMITTER.md` |
| **Committer → Maintainer** | See `Governance/roles/COMMITTER.md` |

Triagers interested in promotion should express interest to a Maintainer.

## How Triagers Are Added

1. **Nomination**: Any Maintainer, Reviewer, or Triager may nominate a Contributor who has:
   - **Minimum 10 triage actions** (labeling, closing, routing) in past 60 days
   - **Demonstrated judgment** in categorization and prioritization
   - **Good standing** (no CoC violations, respects triage process)
2. **Discussion**: 7-day discussion period
3. **Approval**: Maintainer consensus (no objections)
4. **Onboarding**: Added to `triagers` team; receives triage guidelines, label taxonomy, and tool access

## Workflow Reference

### Daily Triage Checklist
- [ ] Check new issues in all repos
- [ ] Apply type/priority/area labels
- [ ] Close duplicates/invalid with comment
- [ ] Request missing reproduction info
- [ ] Assign to Reviewer team or Maintainer
- [ ] Update project board columns

### Weekly Backlog Review
- [ ] Review P2/P3 issues >30 days old
- [ ] Re-prioritize based on project goals
- [ ] Close `stale` issues per policy
- [ ] Update metrics dashboard

### Monthly
- [ ] Review label taxonomy for gaps
- [ ] Sync with Maintainers on priority shifts
- [ ] Report triage metrics (volume, response time, closure rate)

## Documentation

- Label taxonomy: `Governance/LABEL_TAXONOMY.md`
- Triage process: `Governance/processes/TRIAGE.md`
- Stale issues policy: `Governance/policies/STALE_ISSUES.md`
- Escalation path: `Governance/policies/ESCALATION_PATH.md`
- This document: `Governance/roles/TRIAGER.md`