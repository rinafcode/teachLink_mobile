# Contributor Onboarding Process

## Purpose

This document defines the onboarding experience for new contributors to TeachLink Mobile, ensuring they receive the resources, guidance, and connections needed to make meaningful contributions quickly and confidently.

## Onboarding Owner

**Community Manager** owns the onboarding process, with support from:
- **Docs Lead**: Documentation resources
- **Reviewers**: Review process guidance
- **Triagers**: Issue queue navigation
- **Maintainers**: Governance overview

## Onboarding Steps

### Step 1: Welcome & Orientation (Automated, Immediate)

**Trigger**: First merged PR, first issue comment, or explicit opt-in via website

**Actions**:
1. **Automated welcome message** (GitHub/discord):
   - Link to `CONTRIBUTING.md`
   - Link to `CODE_OF_CONDUCT.md`
   - Link to `Governance/VALUES.md`
   - Invitation to `#welcome` channel (Discord/Slack)
   - "Good first issue" label filter link
2. **Contributor badge** added on GitHub profile (auto via `all-contributors` bot)
3. **Added to `contributors` team** (read access to private discussion repos if applicable)

### Step 2: Guided First Contribution (Week 1)

**Goal**: Complete a "Good First Issue" with mentor support

**Resources Provided**:
- **Mentor matching**: Community Manager pairs with experienced Reviewer/Committer (opt-in)
- **Curated issue list**: Filtered `good-first-issue` + `help-wanted` by interest area
- **Contribution checklist**: Branch naming, commit messages, testing, CHANGELOG
- **Live office hours**: Weekly 1-hour drop-in (Community Manager + rotating Reviewer)

**Milestone**: First PR merged → Contributor recognized in release notes

### Step 3: Deep Dive & Skill Building (Weeks 2–4)

**Goal**: Build confidence across contribution types

**Activities**:
| Week | Focus | Resources |
|------|-------|-----------|
| 2 | Codebase architecture | `docs/ARCHITECTURE.md`, `docs/GETTING_STARTED.md`, repo tour video |
| 3 | Review process | Shadow a Reviewer (observe 2 reviews); `Governance/policies/REVIEW_POLICY.md` |
| 4 | Testing & CI | Write a test; run CI locally; `docs/TESTING.md` |

**Optional Deep Dives** (choose based on interest):
- Mobile platform specifics (iOS/Android native modules)
- Accessibility testing
- Documentation writing
- Triaging issues
- Design system contributions

### Step 4: Community Integration (Month 1–2)

**Goal**: Become a self-sufficient, connected community member

**Activities**:
- **Attend community call**: Monthly sync (agenda: roadmap, blockers, celebrations)
- **Join interest channel**: `#ui`, `#platform`, `#docs`, `#testing`, `#a11y`
- **Nominate for role**: If interested, discuss Reviewer/Triager path with mentor
- **Give back**: Mentor next cohort; write "How I started" blog post

## Resources Provided to New Contributors

### Documentation Pack (Delivered Step 1)

| Resource | Format | Location |
|----------|--------|----------|
| **Contributing Guide** | Markdown | `CONTRIBUTING.md` |
| **Code of Conduct** | Markdown | `CODE_OF_CONDUCT.md` |
| **Core Values** | Markdown | `Governance/VALUES.md` |
| **Architecture Overview** | Markdown + Diagrams | `docs/ARCHITECTURE.md` |
| **Development Setup** | Markdown | `docs/GETTING_STARTED.md` |
| **Testing Guide** | Markdown | `docs/TESTING.md` |
| **Review Process** | Markdown | `Governance/policies/REVIEW_POLICY.md` |
| **Label Taxonomy** | Markdown | `Governance/LABEL_TAXONOMY.md` |
| **Governance Index** | Markdown | `Governance/README.md` |
| **FAQ** | Markdown | `docs/FAQ.md` |

### Tool Access (Granted Step 1–2)

| Tool | Access Level | When |
|------|--------------|------|
| **GitHub Repos** | Read (all); Write (own forks) | Immediate |
| **GitHub Discussions** | Read/Write | Immediate |
| **Discord/Slack** | Member role | Step 1 |
| **CI/CD Logs** | Read (all) | Step 2 |
| **TestFlight/Play Console** | Tester (internal) | Step 3 |
| **Private Discussion Repos** | Read | After 1 merged PR |

### Mentor Program

- **Volunteer basis**: Reviewers, Committers, Maintainers opt-in
- **Commitment**: 1 hour/week for 4 weeks per mentee
- **Matching**: By interest area (UI, platform, docs, testing, etc.)
- **Mentor responsibilities**:
  - Answer questions (async + 1 sync/week)
  - Review mentee's first 3 PRs (extra care)
  - Introduce to relevant channels/people
  - Guide role progression discussion

## Who Owns Onboarding

| Role | Responsibility |
|------|----------------|
| **Community Manager** | Owns process, mentor matching, resources, metrics |
| **Docs Lead** | Maintains documentation pack, FAQ, architecture docs |
| **Reviewers** | Mentor pool; shadow reviews; first PR extra care |
| **Triagers** | Curate `good-first-issue` labels; route newcomers |
| **Maintainers** | Approve mentor assignments; resolve escalations |

## Measuring Success

### Metrics (Tracked Monthly)

| Metric | Target |
|--------|--------|
| **Time to first PR** | < 7 days from welcome |
| **First PR merge rate** | > 80% of started PRs |
| **Contributor retention (30 days)** | > 40% |
| **Contributor retention (90 days)** | > 25% |
| **Mentor satisfaction** | > 4/5 |
| **Mentee satisfaction** | > 4/5 |
| **Role progression** | 10% of retained contributors become Reviewer/Triager within 6 months |

### Feedback Collection

- **Week 1 survey**: "How was your welcome? What was confusing?"
- **Week 4 survey**: "What helped? What's missing?"
- **Quarterly retrospective**: Community Manager + Mentors review metrics + feedback

## Special Onboarding Tracks

### Designer Onboarding
- Design system tour (`docs/DESIGN_SYSTEM.md`)
- Figma access + component library
- Accessibility annotation workflow
- Design review process

### Documentation Contributor Onboarding
- Docs toolchain setup (Docusaurus, MDX)
- Style guide (`docs/STYLE_GUIDE.md`)
- Translation workflow (Crowdin/Localazy)
- Doc review process

### Mobile Platform Contributor Onboarding
- Xcode/Android Studio setup
- Device provisioning (TestFlight, Play Console)
- Native module guidelines
- Release process shadowing

## Continuous Improvement

- **Quarterly onboarding retrospective**: Community Manager + Mentors
- **Annual process review**: Maintainers + Community Manager
- **Feedback-driven updates**: Surveys → action items → PRs

## Documentation

- Contributing guide: `CONTRIBUTING.md`
- Code of Conduct: `CODE_OF_CONDUCT.md`
- Core Values: `Governance/VALUES.md`
- Community Manager role: `Governance/roles/COMMUNITY_MANAGER.md`
- This document: `Governance/processes/ONBOARDING.md`