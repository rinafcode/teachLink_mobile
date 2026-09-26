# Non-Goals

## Purpose

This document explicitly defines what TeachLink Mobile will **not** do. Clear non-goals prevent scope creep, align contributor expectations, and focus resources on the project's mission.

---

## Product Non-Goals

### We Will Not Build a Learning Management System (LMS)

**Rationale**: TeachLink is a classroom tool for teachers, not a full LMS. Schools already use Canvas, Schoology, Google Classroom, Blackboard. We integrate with them—we don't compete.

**What this means**:
- No course catalog, enrollment management, or transcript generation
- No institutional admin dashboards (district-level user management)
- No SCORM/xAPI content packaging
- No LTI tool provider/consumer implementation

**Revisit trigger**: If >50% of target schools lack LMS access (annual survey).

---

### We Will Not Build a Student Information System (SIS)

**Rationale**: SISs (PowerSchool, Infinite Campus, Skyward, Synergy) are deeply entrenched. We sync with them via CSV/API; we don't replace them.

**What this means**:
- No official enrollment records, attendance tracking (beyond class-level), discipline records
- No transcript generation, GPA calculation, graduation tracking
- No state reporting compliance (CALPADS, TSDS, etc.)

**Revisit trigger**: If >30% of target schools lack SIS integration (annual survey).

---

### We Will Not Build Video Conferencing

**Rationale**: Zoom, Google Meet, Microsoft Teams are mature, feature-rich, and widely adopted. Native video adds massive complexity (WebRTC, signaling, bandwidth, recording, compliance) for marginal differentiation.

**What this means**:
- No native video calls, screen sharing, breakout rooms
- No recording/transcription
- No virtual backgrounds, filters, reactions

**Integration approach**: Deep links to Zoom/Meet/Teams; calendar integration; "Join Meeting" buttons in announcements.

**Revisit trigger**: If integration APIs become unreliable or schools block external tools (annual review).

---

### We Will Not Build a Content Marketplace

**Rationale**: Teachers create and share resources. A marketplace adds moderation, payments, licensing, DRM, and legal complexity. Open sharing aligns with our values.

**What this means**:
- No purchase/rental of lesson plans, worksheets, assessments
- No revenue sharing, creator payouts, subscription tiers
- No DRM, watermarking, access control on shared resources
- No curated "verified creator" program

**Sharing model**: Open, attribution-based (CC-BY default); teachers own their content.

**Revisit trigger**: If teacher survey shows >60% want monetization (biennial).

---

### We Will Not Build Adaptive/Personalized Learning Algorithms

**Rationale**: AI-driven personalization conflicts with teacher agency, student privacy, and pedagogical transparency. Teachers know their students best.

**What this means**:
- No "recommended next activity" based on ML
- No automated mastery tracking or pacing
- No predictive analytics for student outcomes
- No automated differentiation recommendations

**Alternative**: Teachers use standards-based grading data to manually differentiate.

**Revisit trigger**: If peer-reviewed research shows clear pedagogical benefit without privacy tradeoffs (literature review every 2 years).

---

### We Will Not Build Gamification or Behavior Management

**Rationale**: Points, badges, leaderboards, behavior tracking undermine intrinsic motivation and can harm vulnerable students. We focus on learning, not compliance.

**What this means**:
- No points, XP, streaks, levels
- No badges, achievements, certificates (except completion certificates)
- No behavior logs, merit/demerit systems, seating charts
- No "classroom economy" features

**Alternative**: Teachers celebrate progress through meaningful feedback, not gamified rewards.

**Revisit trigger**: Never. This is a values-based non-goal (`Governance/VALUES.md`: Learner-Centered).

---

### We Will Not Build a Standalone Parent App

**Rationale**: Parents engage through teacher communication. A separate app fragments attention, duplicates effort, and creates privacy complexity.

**What this means**:
- No separate parent login, dashboard, or mobile app
- No parent-to-parent messaging
- No parent-teacher conference scheduling (use calendar links)
- No parent volunteer signup, payment, permission slips

**Parent access**: Via teacher-generated magic links, email summaries, PDF exports.

**Revisit trigger**: If >40% of teachers request dedicated parent portal (annual survey).

---

### We Will Not Build High-Stakes Assessment Tools

**Rationale**: Summative assessment requires psychometric validity, security, accommodation support, and regulatory compliance beyond our scope.

**What this means**:
- No standardized test delivery (state tests, SAT/ACT practice)
- No proctoring, lockdown browser, plagiarism detection
- No IEP/504 accommodation management for testing
- No score reporting to state/federal agencies

**Formative only**: Quizzes, exit tickets, rubrics, peer review—teacher-created, low-stakes.

**Revisit trigger**: If regulatory landscape changes to allow lightweight assessment (monitor annually).

---

## Technical Non-Goals

### Platform Non-Goals

| Platform | Reason |
|----------|--------|
| Web/Desktop (Electron, PWA, Tauri) | Mobile-first; teacher workflow is mobile; resource constraints |
| Windows/macOS native | <2% target users; resource constraints |
| ChromeOS (beyond Android) | Android apps cover ChromeOS; no separate investment |
| watchOS/tvOS/visionOS | No teacher workflow on these form factors |
| KaiOS/Feature phones | <0.1% target users; keyboard/input constraints |

**Revisit trigger**: Platform adoption shifts >5% in teacher survey (annual).

---

### Architecture Non-Goals

| Non-Goal | Reason |
|----------|--------|
| Microservices backend | Single team; monolith + modular monolith is simpler |
| GraphQL API | REST + TypeScript types sufficient; adds complexity |
| Event sourcing/CQRS | Overkill for CRUD-heavy classroom app |
| Blockchain/Web3 | No user value; contradicts privacy/sustainability values |
| Real-time collaboration (CRDT/OT) | Teacher workflows are async; conflict risk > benefit |
| Custom rendering engine | React Native + Expo sufficient; no game-engine needs |

---

### Infrastructure Non-Goals

| Non-Goal | Reason |
|----------|--------|
| Self-hosted Kubernetes | Managed services (Expo, Firebase, Supabase) reduce ops burden |
| Custom CI/CD | GitHub Actions + EAS/Fastlane sufficient |
| Multi-region active-active | Single-region with backups meets RPO/RTO for v1 |
| Custom observability stack | Datadog/Sentry/LogRocket cover needs |
| On-premise deployment option | Schools use cloud; air-gapped not in scope |

---

## Process Non-Goals

### We Will Not Accept

| Non-Goal | Reason |
|----------|--------|
| Anonymous contributions (no GitHub account) | Accountability, CoC enforcement, attribution |
| Contributions without tests | Quality gate; `CONTRIBUTING.md` requires tests |
| Contributions without CHANGELOG entry | Release transparency; `CHANGELOG_POLICY.md` |
| Direct pushes to `main` | Branch protection; review required |
| Unsigned commits (on protected branches) | Supply chain security; `Governance/policies/EMBARGO.md` |
| Dependencies with prohibited licenses | Legal risk; `Governance/policies/ATTRIBUTION.md` |

---

## Revisiting Non-Goals

### Standard Process

1. **Proposal**: GitHub issue with `non-goal-revisit` label
2. **Evidence required**:
   - User research/data supporting change
   - Effort estimate
   - Risk assessment
   - Values alignment analysis
3. **Discussion**: 30-day community discussion
4. **Decision**: Maintainer consensus + Values alignment check

### Values-Based Non-Goals (Never Revisit)

- No gamification/behavior management
- No high-stakes assessment
- No student data monetization
- No proprietary lock-in

These are rooted in `Governance/VALUES.md` and require **unanimous Maintainer consent + 60-day community notice** to change.

---

## Related Documents

- Scope Statement: `Governance/SCOPE.md`
- Core Values: `Governance/VALUES.md`
- Engineering Principles: `Governance/PRINCIPLES.md`
- This document: `Governance/NON_GOALS.md`