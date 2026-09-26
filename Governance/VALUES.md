# TeachLink Mobile Core Values

## Purpose

This document defines the core values that guide TeachLink Mobile's decisions, culture, and governance. These values are not aspirational—they are the standards we hold ourselves to every day.

---

## 1. Learner-Centered

**Definition**: Every decision starts with the question: "Does this help teachers teach and students learn?"

**In Practice**:
- Features prioritize pedagogical impact over technical novelty
- Accessibility is a baseline requirement, not an afterthought
- We design for diverse classrooms: varying resources, abilities, languages, and contexts
- User research with actual teachers precedes major feature work

**Decision Lens**: "If this feature shipped tomorrow, would a teacher in an under-resourced classroom benefit?"

---

## 2. Open by Default

**Definition**: We work in the open—code, discussions, decisions, and data are public unless there's a compelling reason not to be.

**In Practice**:
- All development happens in public repositories
- Governance discussions occur in GitHub Discussions, not private channels
- Roadmaps, priorities, and rationale are published
- Security vulnerabilities follow responsible disclosure (not secrecy by default)
- Financial reports are public (per Treasurer role)

**Decision Lens**: "Can this be public? If not, why? Is the reason documented?"

---

## 3. Sustainable Pace

**Definition**: We optimize for long-term contributor health and project longevity over short-term velocity.

**In Practice**:
- No hero culture: we don't rely on unsustainable overtime or weekend pushes
- Review SLAs respect human limits (3 business days, not hours)
- On-call rotations are fair, documented, and voluntary
- Contributors can pause without guilt; "good first issue" queues stay stocked
- Burnout signals (silence, irritability, reduced output) trigger check-ins, not pressure

**Decision Lens**: "Can this pace continue for a year? If not, what changes?"

---

## 4. Earned Trust

**Definition**: Authority comes from demonstrated contribution and community confidence, not title or tenure.

**In Practice**:
- Roles (Reviewer, Committer, Maintainer) are earned through documented criteria
- Nominations are public; decisions are consensus-based
- No lifetime appointments: roles require ongoing contribution
- New voices are actively invited; "how we've always done it" is not an argument
- Mistakes are admitted openly; learning is valued over blame

**Decision Lens**: "Would this decision hold up if made by a newcomer with the same evidence?"

---

## 5. Pragmatic Craft

**Definition**: We value working, maintainable solutions over theoretical purity. Good enough to ship, good enough to maintain.

**In Practice**:
- Tech debt is tracked, prioritized, and paid down incrementally
- We adopt boring technology when it solves the problem
- Code is written for the next person to read, not the compiler
- Refactoring is continuous, not a separate phase
- Dependencies are minimized; each adds risk

**Decision Lens**: "Will the maintainer in 6 months thank us for this choice?"

---

## 6. Inclusive Collaboration

**Definition**: We actively remove barriers to contribution and amplify underrepresented voices.

**In Practice**:
- "Good first issue" labels are maintained and mentored
- Documentation assumes no prior context; jargon is defined
- Meetings are async-first; sync meetings are recorded and summarized
- CoC enforcement is swift, transparent, and proportionate
- We design for global contributors: time zones, languages, bandwidth, devices

**Decision Lens**: "Who is excluded by this approach? Can we include them?"

---

## 7. Transparent Governance

**Definition**: How we decide is as important as what we decide. Process is documented, repeatable, and auditable.

**In Practice**:
- All roles, policies, and processes documented in `Governance/`
- Decisions recorded with rationale; dissenting views preserved
- Changes to governance follow the same process they govern
- Appeals process exists for role removals and policy disputes
- Annual governance retrospective with community input

**Decision Lens**: "Could a newcomer understand how this decision was made?"

---

## How Values Inform Decisions

When facing a trade-off, apply the **Values Decision Matrix**:

| Decision | Learner-Centered | Open by Default | Sustainable Pace | Earned Trust | Pragmatic Craft | Inclusive Collaboration | Transparent Governance |
|----------|------------------|-----------------|------------------|--------------|-----------------|-------------------------|------------------------|
| **Example: Adopt new framework** | Does it improve teacher/student experience? | RFC public? | Migration feasible in 6 months? | Decision by Maintainer consensus? | Simpler than current stack? | Migration guide for all skill levels? | RFC + decision logged? |

**Scoring**: Each value = +1 (supports), 0 (neutral), -1 (conflicts). Net positive → proceed. Net negative → iterate. Mixed → escalate to Maintainers with analysis.

---

## Revisiting Values

- **Annual review**: Values reviewed at annual governance retrospective
- **Proposal process**: Any Contributor may propose a value change via GitHub issue (label: `governance`, `values`)
- **Approval**: Maintainer consensus + 30-day community comment period
- **Versioning**: Values document versioned; history preserved in Git

---

## Related Documents

- Code of Conduct: `CODE_OF_CONDUCT.md`
- Contribution guide: `CONTRIBUTING.md`
- Governance roles: `Governance/roles/`
- Governance policies: `Governance/policies/`
- Governance processes: `Governance/processes/`
- This document: `Governance/VALUES.md`