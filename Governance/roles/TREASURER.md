# Treasurer Role

## Purpose

The Treasurer oversees the financial stewardship of TeachLink Mobile, ensuring transparent, accountable, and sustainable management of project funds.

## Responsibilities

### Financial Management
- **Budget planning**: Develop annual budget in coordination with Maintainers; present for approval before fiscal year start.
- **Expense approval**: Review and approve expenditures within authority limits (see Spending Authority below).
- **Bookkeeping**: Maintain accurate, up-to-date financial records in the project's accounting system.
- **Banking & custody**: Manage project bank accounts, payment processors, and fund custody; ensure multi-party controls.

### Reporting & Transparency
- **Monthly financial report**: Publish summary of income, expenses, cash position, and budget variance to Maintainers and community.
- **Quarterly deep dive**: Detailed financial review with Maintainers including forecasts and risk assessment.
- **Annual statement**: Comprehensive year-end financial statement with auditor review (if applicable).
- **Public transparency**: Maintain public ledger of all transactions (redacted for privacy where required).

### Compliance & Risk
- **Legal compliance**: Ensure adherence to non-profit/tax regulations, donation laws, and sponsor agreements.
- **Fraud prevention**: Implement controls (dual approval, receipts, audit trail) to prevent misuse.
- **Reserve management**: Maintain adequate reserves (target: 6 months operating expenses); recommend reserve policy changes.
- **Grant & sponsorship management**: Track restricted funds, deliverables, and reporting requirements.

### Community Support
- **Contributor reimbursements**: Process approved travel, hardware, and event expense reimbursements promptly.
- **Funding proposals**: Assist working groups and contributors in preparing grant applications and sponsorship pitches.
- **Financial onboarding**: Guide new Maintainers and role-holders on financial processes.

## Spending Authority Limits

| Amount (USD) | Approval Required |
|--------------|-------------------|
| **≤ $500** | Treasurer approval only |
| **$501 – $2,000** | Treasurer + one Maintainer |
| **$2,001 – $10,000** | Treasurer + Maintainer consensus |
| **> $10,000** | Full Maintainer vote (simple majority) |
| **Recurring commitments** (monthly/annual) | Maintainer consensus regardless of amount |
| **Unbudgeted emergencies** | Treasurer + one Maintainer (retroactive Maintainer vote within 7 days) |

*All amounts in USD. Limits reset annually with budget approval.*

### Pre-Approved Categories
The following recurring expenses are pre-approved within the annual budget and do not require per-transaction approval:
- Infrastructure hosting (CI/CD, hosting, domain registration)
- Software licenses & subscriptions (approved tools)
- Payment processor fees
- Accounting & compliance services
- Insurance premiums

## Reporting Obligations

| Report | Frequency | Audience | Format |
|--------|-----------|----------|--------|
| **Cash position & transactions** | Monthly | Maintainers, Community | GitHub Issue + public spreadsheet |
| **Budget vs. actual** | Monthly | Maintainers | Spreadsheet with variance analysis |
| **Quarterly review** | Quarterly | Maintainers | Meeting + written summary |
| **Annual financial statement** | Annually | Maintainers, Community, Sponsors | Formal report (PDF) |
| **Tax/regulatory filings** | As required | Authorities | As mandated |

## Term & Selection

- **Term**: 1 year, renewable indefinitely with Maintainer consensus.
- **Selection**: Nominated by any Maintainer; approved by Maintainer consensus (no objections after 14-day discussion).
- **Qualifications**:
  - Financial literacy (budgeting, accounting basics)
  - Trustworthiness and integrity
  - Availability for monthly reviews
  - No conflict of interest with project vendors/sponsors
- **Transition**: 30-day handoff period with outgoing Treasurer; access transfer documented.

## Conflict of Interest

The Treasurer must:
- Disclose any personal or professional relationships with vendors, sponsors, or funding sources.
- Recuse from decisions involving disclosed conflicts.
- Not use project funds for personal benefit.
- Maintain separation between personal and project finances.

## Authority & Limits

| Authority | Limit |
|-----------|-------|
| Authorize expenditures within limits | Cannot exceed budget without Maintainer approval |
| Manage bank accounts & payment processors | Cannot open/close accounts without Maintainer vote |
| Sign contracts up to $2,000 | Larger contracts require Maintainer co-signature |
| Access financial records | Cannot share sensitive data outside authorized roles |
| Recommend budget changes | Cannot implement without Maintainer approval |

## Relationship to Other Roles

| Role | Interaction |
|------|-------------|
| **Maintainers** | Approve budget, authorize large expenditures, elect Treasurer |
| **Working Group Leads** | Submit funding requests; Treasurer evaluates feasibility |
| **Release Manager** | Coordinate release-related expenses (signing, notarization) |
| **Security Officer** | Coordinate on security audit/incident response costs |
| **Community Manager** | Coordinate community event budgets |

## Removal & Succession

- **Voluntary resignation**: 30-day notice; assist with transition.
- **Removal**: Maintainer consensus (no objections after 14-day discussion) for:
  - Failure to meet reporting obligations (2+ missed reports)
  - Exceeding spending authority without approval
  - Conflict of interest violations
  - Code of Conduct violations
- **Interim Treasurer**: Maintainers appoint interim within 7 days; full election within 30 days.

## Documentation

- Expense request template: `.github/ISSUE_TEMPLATE/expense-request.yml`
- Budget template: `Governance/templates/BUDGET_TEMPLATE.xlsx` (if exists)
- Monthly report template: `Governance/templates/MONTHLY_FINANCIAL_REPORT.md`
- This document: `Governance/roles/TREASURER.md`