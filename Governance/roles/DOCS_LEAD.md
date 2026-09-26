# Documentation Lead Role

## Purpose

The Documentation Lead (Docs Lead) owns the strategy, quality, and governance of all TeachLink Mobile documentation. They ensure docs are accurate, accessible, and maintainable—serving teachers, developers, and contributors alike.

## Responsibilities

### Documentation Strategy & Standards
- **Own the docs vision**: Define documentation goals, target audiences, and success metrics
- **Establish standards**: Style guide, information architecture, terminology glossary, formatting conventions
- **Tooling decisions**: Choose and maintain docs toolchain (Docusaurus, MDX, search, i18n, versioning)
- **Content strategy**: Decide what to document, depth level, and update cadence

### Quality Assurance
- **Review all docs PRs** for accuracy, clarity, completeness, and style adherence
- **Audit existing docs** quarterly for outdated, duplicate, or missing content
- **Enforce accessibility**: WCAG 2.1 AA compliance for all published docs
- **Manage translations**: Coordinate i18n workflow; review community translations

### Maintenance & Operations
- **Versioning**: Align docs versions with releases; maintain `latest` and versioned docs
- **Deprecation notices**: Flag and migrate deprecated content per `Governance/policies/DEPRECATION.md`
- **Link health**: Automated link checking; fix broken internal/external links
- **Search & SEO**: Optimize discoverability; maintain sitemaps and structured data

### Community & Contributor Enablement
- **Onboard doc contributors**: Maintain "Good first docs issue" queue; mentor new writers
- **Doc sprints**: Organize periodic documentation hackathons/sprints
- **Feedback loops**: Collect and prioritize user feedback (surveys, analytics, issue tags)
- **Recognize contributors**: Highlight doc contributions in release notes and `Governance/RECOGNITION.md`

### Cross-Functional Coordination
- **Release Manager**: Ensure release notes, migration guides, and versioned docs ship with releases
- **Security Officer**: Review security docs for accuracy; coordinate vulnerability disclosure docs
- **Community Manager**: Align tutorial content with community needs; support event docs
- **Maintainers**: Advocate for docs debt in planning; ensure API changes include doc updates

## Ownership of Documentation Standards

The Docs Lead is the **final authority** on:
- Style guide exceptions (rare; documented with rationale)
- Information architecture changes (navigation, categorization, URL structure)
- Tooling migrations (e.g., Docusaurus v2 → v3, new search provider)
- Translation priorities and resource allocation

Decisions are documented in `Governance/docs/DECISIONS.md` (or similar) with rationale.

## Selection Process

1. **Nomination**: Any Maintainer or Docs Lead may nominate a Contributor/Reviewer with:
   - **Sustained docs contributions**: 10+ merged docs PRs; 6+ months active
   - **Writing & editing skill**: Clear, concise, audience-aware technical writing
   - **Tooling familiarity**: Markdown, MDX, Git, docs toolchain (Docusaurus, etc.)
   - **Standards advocacy**: Demonstrated care for consistency, accessibility, accuracy
2. **Discussion**: 14-day discussion period
3. **Approval**: Maintainer consensus (no objections) or 2/3 majority vote
4. **Onboarding**: Access to docs repos, deployment, analytics, translation platform

## Term & Succession

- **Term**: 1 year, renewable with Maintainer consensus
- **Transition**: 30-day handoff with outgoing Docs Lead
- **Interim**: Maintainers appoint interim within 14 days if role vacated

## Authority & Limits

| Authority | Limit |
|-----------|-------|
| Approve/reject docs PRs | Cannot merge code PRs (unless also Committer) |
| Set style guide & IA | Major IA changes require Maintainer sign-off |
| Prioritize docs backlog | Cannot reassign code reviewers/maintainers |
| Allocate translation budget | Within approved budget; larger requests need Maintainer approval |
| Deprecate/remove docs | Follows DEPRECATION.md policy |

## Relationship to Other Roles

| Role | Interaction |
|------|-------------|
| **Release Manager** | Sync on release notes, migration guides, versioned docs timing |
| **Security Officer** | Review security advisories, disclosure docs, crypto docs |
| **Community Manager** | Coordinate tutorials, event docs, onboarding content |
| **Maintainers** | Advocate for docs debt; ensure code changes include doc updates |
| **Reviewers** | Code reviewers check for doc updates; Docs Lead reviews docs PRs |

## Recognition

- Listed in `Governance/RECOGNITION.md` and project website
- Docs Lead badge on GitHub profile
- Annual "Documentation Champion" recognition

## Documentation

- Style guide: `docs/STYLE_GUIDE.md` (or similar)
- Contribution guide: `CONTRIBUTING.md` (docs section)
- Deprecation policy: `Governance/policies/DEPRECATION.md`
- This document: `Governance/roles/DOCS_LEAD.md`