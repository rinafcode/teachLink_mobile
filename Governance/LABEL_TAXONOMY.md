# Label Taxonomy

## Purpose

This document defines the standardized label taxonomy for the TeachLink Mobile repository. Labels provide a consistent way to categorize, prioritize, and track issues and pull requests (PRs). This taxonomy ensures that contributors and maintainers have a clear, shared understanding of what each label means and when to apply it.

## Scope

This taxonomy applies to all issues and pull requests in the TeachLink Mobile repository. All contributors should follow these guidelines when labeling or creating issues and PRs. Maintainers are responsible for ensuring labels are applied correctly and consistently.

## Label Categories

Labels are organized into the following categories:

### Type Labels

These labels describe the nature of the work:

| Label | Color | Meaning | When to Apply |
|-------|-------|---------|---------------|
| `bug` | red | A defect, error, or unexpected behavior in the code | When an issue reports something that is broken or not working as documented |
| `feature` | purple | A new capability or user-facing functionality | When proposing a new feature that adds value for users |
| `enhancement` | blue | An improvement to existing functionality (not a new feature) | When improving existing features without adding new capabilities |
| `documentation` | green | Changes to documentation, guides, or comments | When the work primarily affects docs, README, or inline comments |
| `chore` | gray | Maintenance tasks, dependencies, or tooling | When the work is routine maintenance (deps, config, cleanup) |
| `refactor` | orange | Code restructuring without behavior change | When improving code structure, readability, or technical debt |
| `test` | yellow | Test additions, improvements, or fixes | When the work is primarily about test coverage or test fixes |
| `performance` | purple | Performance optimizations or improvements | When the change improves speed, memory usage, or efficiency |

### Priority Labels

These labels indicate urgency and importance:

| Label | Color | Meaning | When to Apply |
|-------|-------|---------|---------------|
| `critical` | red | Requires immediate attention; blocks release or users | When the issue affects production, data integrity, or security |
| `high` | orange | Important; should be addressed soon | When the issue has significant impact but is not blocking |
| `medium` | yellow | Normal priority; standard backlog item | When the issue is important but not urgent |
| `low` | blue | Nice to have; can be deferred | When the issue has minimal impact or is cosmetic |

### Component Labels

These labels indicate which part of the codebase is affected:

| Label | Color | Meaning | When to Apply |
|-------|-------|---------|---------------|
| `UI` | pink | User interface components and screens | When the change affects visual elements, screens, or user interactions |
| `API` | green | API integration, endpoints, or data fetching | When the work involves API calls, networking, or data synchronization |
| `auth` | red | Authentication, authorization, or user management | When the change affects login, signup, permissions, or user sessions |
| `database` | blue | Local storage, caching, or data persistence | When the work involves AsyncStorage, SQLite, or local data management |
| `navigation` | orange | Screen navigation, routing, or deep linking | When the change affects how users move through the app |
| `notifications` | yellow | Push notifications, in-app alerts, or messaging | When the work involves notification systems or alerts |
| `analytics` | purple | Tracking, metrics, or analytics integration | When the change affects event tracking or analytics data |

### Status Labels

These labels track the current state of work:

| Label | Color | Meaning | When to Apply |
|-------|-------|---------|---------------|
| `in-progress` | blue | Actively being worked on | When someone has started implementation |
| `review-needed` | yellow | Ready for maintainer review | When a PR is complete and awaiting feedback |
| `blocked` | red | Cannot proceed due to dependency | When the work is waiting on another issue or PR |
| `ready-to-merge` | green | Approved and ready to be merged | When a PR has passed review and all checks |
| `stale` | gray | No recent activity; may need attention | When an issue or PR has been inactive for 30+ days |
| `wontfix` | gray | Decided not to implement | When the team has explicitly decided not to address |

### Domain Labels

These labels indicate the governance domain or area of impact:

| Label | Color | Meaning | When to Apply |
|-------|-------|---------|---------------|
| `governance` | purple | Changes to governance, policies, or processes | When the work affects project governance or documentation |
| `security` | red | Security vulnerabilities, fixes, or improvements | When the change affects security, privacy, or data protection |
| `accessibility` | blue | Accessibility improvements or fixes | When the change affects screen readers, contrast, or a11y standards |
| `i18n` | green | Internationalization or localization | When the work affects translations, locales, or multi-language support |

### Size Labels

These labels estimate the complexity or effort required:

| Label | Color | Meaning | When to Apply |
|-------|-------|---------|---------------|
| `size/XS` | gray | Less than 1 day of work | For very small, quick fixes or changes |
| `size/S` | green | 1-2 days of work | For small, well-scoped tasks |
| `size/M` | yellow | 3-5 days of work | For medium-sized features or fixes |
| `size/L` | orange | 1-2 weeks of work | For large features requiring significant effort |
| `size/XL` | red | More than 2 weeks of work | For very large initiatives that may need breaking down |

## Rules for Applying Labels

### General Guidelines

1. **At least one Type label** is required for every issue and PR
2. **At most one Priority label** should be applied (use the highest applicable)
3. **Multiple Component labels** can be applied if the work spans multiple areas
4. **Status labels** are managed by maintainers and should reflect current state
5. **Size labels** should be estimated when the issue is created and updated if scope changes

### Label Combinations

Valid combinations:
- `bug` + `high` + `UI` + `in-progress`
- `feature` + `medium` + `API` + `database`
- `documentation` + `governance`
- `refactor` + `low` + `size/S`

Invalid combinations:
- `bug` + `feature` (mutually exclusive types)
- `critical` + `low` (mutually exclusive priorities)
- `ready-to-merge` + `blocked` (mutually exclusive statuses)

### When to Label

- **On issue creation**: Apply Type, Priority (if known), Component, and Size labels
- **On PR creation**: Apply Type, Component, and any relevant Domain labels
- **During triage**: Maintainers add/adjust Priority and Status labels
- **During review**: Maintainers update Status labels as work progresses
- **On merge**: Remove `in-progress` and `review-needed`, add appropriate milestone

### Label Cleanup

- Remove `stale` label when activity resumes
- Remove `blocked` label when the dependency is resolved
- Remove `wontfix` label if the decision is reconsidered
- Remove Size labels after work is complete (they are for planning, not historical record)

## Ownership

The maintainers own this label taxonomy and review it quarterly. Proposals to add, remove, or change labels should be made in a pull request that touches only the `Governance/` folder. Changes should be discussed with the team before implementation to ensure consensus.

## Success

This taxonomy succeeds when:
- All issues and PRs have consistent, meaningful labels
- Contributors understand when and how to apply labels
- Labels help the team prioritize, triage, and track work effectively
- The label set remains manageable and relevant (no unused or redundant labels)
- New contributors can quickly understand the labeling system by reading this document
