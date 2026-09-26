# Project Scope Statement

## Purpose

This document defines what is in scope for the TeachLink Mobile project, establishing clear boundaries to guide decision-making, prioritization, and contributor expectations.

## In Scope

### Core Product: TeachLink Mobile App

**Platform**: iOS (iPhone/iPad) and Android (phones/tablets)

**Primary Users**:
- Teachers (K-12, all subjects)
- Students (K-12, via teacher-managed classes)
- School administrators (class roster management, analytics)

**Core Features**:
- **Classroom Management**: Create classes, manage rosters, student profiles
- **Lesson Planning**: Create, organize, share lesson plans; align to standards
- **Assignment Workflow**: Create, distribute, collect, grade assignments
- **Communication**: Announcements, private messaging (teacher↔student, teacher↔parent)
- **Progress Tracking**: Standards-based grading, competency tracking, reports
- **Resource Library**: Curated educational resources, teacher-created content sharing
- **Offline-First**: Core functionality works offline; sync when online
- **Accessibility**: WCAG 2.1 AA compliance; screen reader support; multiple languages

### Supported Platforms & Versions

| Platform | Minimum Version | Target Version |
|----------|-----------------|----------------|
| iOS | 15.0+ | Latest stable |
| iPadOS | 15.0+ | Latest stable |
| Android | API 24 (7.0)+ | Latest stable |

### Integrations (In Scope)

- **Authentication**: Apple Sign In, Google Sign In, Microsoft Entra ID (school accounts)
- **Cloud Sync**: iCloud (iOS), Google Drive (Android), custom backend (self-hosted option)
- **Standards Alignment**: Common Core, NGSS, State standards (US); extensible for others
- **LMS Export**: CSV, Google Classroom, Canvas, Schoology (one-way export)
- **Single Sign-On**: SAML/OIDC for school districts (enterprise)

### Data & Privacy (In Scope)

- **Student Data Protection**: FERPA, COPPA, GDPR compliance by design
- **Data Minimization**: Collect only what's needed for educational purpose
- **Parental Consent**: Verified consent for students under 13
- **Data Portability**: Export all user data in standard formats (JSON, CSV)
- **Data Retention**: Configurable retention policies; right to deletion

## Out of Scope

### Explicitly Not Building

| Area | Reason |
|------|--------|
| **Learning Management System (LMS)** | TeachLink is a classroom tool, not a full LMS; integrates with LMSs |
| **Student Information System (SIS)** | Integrates with SISs; does not replace them |
| **Video Conferencing** | Integrates with Zoom/Meet/Teams; no native video |
| **Content Authoring Platform** | Teachers create lessons; not a marketplace or CMS |
| **Adaptive Learning Engine** | No AI-driven personalization; teacher-directed instruction |
| **Gamification/Behavior Management** | Focus on pedagogy, not behavior tracking |
| **Parent Portal (standalone)** | Parents access via teacher invites; no separate parent app |
| **Assessment/Testing Platform** | Formative assessment tools only; no summative/high-stakes testing |
| **Custom Hardware** | Software only; no proprietary devices |

### Platforms Not Supported

| Platform | Status |
|----------|--------|
| Web/Desktop (Electron/PWA) | Not planned; mobile-first |
| Windows/macOS native | Not planned |
| ChromeOS (beyond Android apps) | Not planned |
| watchOS/tvOS/visionOS | Not planned |
| Feature phones/KaiOS | Not planned |

### Features Explicitly Deferred

| Feature | Deferred Until |
|---------|----------------|
| AI-assisted lesson planning | Post-v2.0; requires privacy review |
| Peer student collaboration | Post-v1.5; requires moderation tools |
| Parent-teacher conference scheduling | Post-v1.5; integration with calendar |
| Standards gap analysis | Post-v2.0; requires data partnerships |
| District-wide analytics dashboard | Enterprise tier; post-v2.0 |

## Current Boundaries (v1.x)

| Boundary | Current Limit | Expansion Criteria |
|----------|---------------|-------------------|
| **Class size** | 200 students/class | Performance testing at scale |
| **File upload** | 100MB/file, 5GB total | Storage cost review |
| **Offline storage** | 2GB local | Device capacity survey |
| **Languages** | EN, ES, FR, PT, ZH, AR | Community translation + QA |
| **Standards sets** | US (CCSS, NGSS, 50 states) | International on demand + contributor |

## Scope Change Process

### Proposing a Scope Change

1. **Proposal**: Open GitHub issue with `scope-change` label including:
   - What to add/remove
   - User problem solved
   - Effort estimate (T-shirt size)
   - Dependencies & risks
   - Alignment with core values (`Governance/VALUES.md`)

2. **Discussion**: 14-day community discussion period

3. **Decision**: Maintainer consensus (no objections) or 2/3 majority vote

4. **Implementation**: Approved changes → update this document + roadmap + `CHANGELOG.md`

### Emergency Scope Changes

For critical security/legal/compliance issues:
- Maintainers can approve immediate scope change
- Ratified at next Maintainer meeting
- Documented in `CHANGELOG.md`

## Decision Lens

When evaluating requests, apply:

| Question | In Scope If... |
|----------|----------------|
| Does it directly help teachers teach? | Yes |
| Does it directly help students learn? | Yes |
| Is it mobile-first, offline-capable? | Yes |
| Does it protect student privacy by default? | Yes |
| Can it be built sustainably (pace, maintenance)? | Yes |
| Is it accessible by default? | Yes |
| Does it require proprietary hardware/service? | No → Out of scope |

## Review Cadence

- **Quarterly**: Maintainers review scope boundaries with community input
- **Annual**: Full scope statement review; update for vNext planning
- **Ad-hoc**: Emergency changes as needed

## Related Documents

- Core Values: `Governance/VALUES.md`
- Non-Goals: `Governance/NON_GOALS.md`
- Engineering Principles: `Governance/PRINCIPLES.md`
- Release Cadence: `Governance/processes/RELEASE_CADENCE.md`
- This document: `Governance/SCOPE.md`