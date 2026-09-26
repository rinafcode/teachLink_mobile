# Security Response Team Charter

## Purpose

This charter defines who responds to security reports in TeachLink Mobile, what
each role owns, and how on-call coverage works. It gives contributors and
maintainers a single, versioned reference for the security response team.

## Scope

This charter covers security reports for the TeachLink Mobile application, its
build and release pipeline, and the repository's documented integrations. It
works alongside the [Vulnerability Disclosure Process](processes/VULN_DISCLOSURE.md),
the [Security Severity Rubric](SECURITY_SEVERITY_RUBRIC.md), the
[Security Embargo Policy](policies/EMBARGO.md), and the
[Escalation Path](processes/ESCALATION_PATH.md). It does not authorize testing
against other people's accounts, production data, or infrastructure outside the
project's permission.

## Membership

The team is role-based. No separate private roster is kept; each role is
resolved from the artifact that records the work, and contact stays in the
private advisory channel (**Security > Report a vulnerability**), never in a
public issue.

- **Security lead:** owns triage, severity assignment, embargo decisions, and
  the disclosure record. Acknowledges each credible report, assigns a case
  owner, and records acknowledgment time for retrospective review.
- **Case owner:** owns one report end to end. Reproduces the issue in a
  controlled environment, identifies affected versions and platforms, prepares
  mitigations, and keeps the reporter informed at each material milestone.
- **Fix reviewer:** a maintainer who reviews the fix and is not the sole
  author of it. Verifies the fix on supported platforms and checks for
  regressions where applicable.
- **Release owner liaison:** the release owner recorded in the active release
  issue, or their delegate. Prepares the patched build and approves the
  communication plan before the embargo is lifted.

Membership in a case is limited to the minimum necessary, following the embargo
list in the [Security Embargo Policy](policies/EMBARGO.md). The reporter is a
partner in the case and is credited by default unless they request anonymity.

## Responsibilities

- **Acknowledge and triage:** confirm receipt through the private channel and
  assign severity using the [Security Severity Rubric](SECURITY_SEVERITY_RUBRIC.md).
  Critical is acknowledged within 4 business hours, High within 1 business day,
  Medium within 3 business days, and Low within 5 business days.
- **Validate and prioritize:** reproduce the issue, record evidence and
  assumptions, check for known exploitation or data exposure, and set a
  remediation target per the
  [Vulnerability Disclosure Process](processes/VULN_DISCLOSURE.md).
- **Contain:** limit access, disable unsafe paths, or prepare a safe workaround
  when the issue is actively harmful. Inform the reporter of any material
  change.
- **Fix and review:** develop a minimal fix with regression tests where
  applicable, reviewed by a maintainer who is not the sole author, and verified
  on supported platforms.
- **Release and document:** coordinate the patched build with the release
  owner, record the disclosure decision, and publish an advisory that identifies
  impact, affected versions, fixed versions, and mitigations.
- **Protect confidentiality:** keep case details in the private security record
  and on the embargo list until the security lead lifts the embargo under the
  [Security Embargo Policy](policies/EMBARGO.md).
- **Learn:** review this charter, the rubric, and the disclosure process after
  each advisory, and record action items in the security retrospective.

Security matters override the general escalation SLAs, as described in the
[Escalation Path](processes/ESCALATION_PATH.md).

## On-Call Rotation

- **Rotation:** one primary and one secondary serve one-week rotations starting
  Monday 00:00 UTC. The primary handles new reports and active cases; the
  secondary steps in when the primary is unavailable or when a Critical report
  needs parallel handling.
- **Eligibility:** the primary and secondary are drawn from maintainers able to
  serve as security lead or case owner. The upcoming two weeks are posted in the
  private advisory channel before each rotation starts.
- **Handoff:** the outgoing primary posts a short handoff note listing active
  cases, severity, next milestone, and embargo dates. Unacknowledged reports
  transfer explicitly; silence past the severity SLA is grounds to escalate per
  the [Escalation Path](processes/ESCALATION_PATH.md).
- **Coverage:** if the primary cannot respond within the severity SLA, the
  secondary assumes the primary role and records the change. Planned absence
  requires a confirmed swap before the rotation starts.
- **Contact:** all on-call contact uses the private advisory channel. Security
  scope is never paged through public issues, discussions, or social media.

## Ownership and Review

The security lead owns this charter and reviews it after every critical or
high-severity incident and annually otherwise.

Changes to this charter are proposed in a pull request that touches only the
`Governance/` folder.

## Success

This charter succeeds when every credible report has a named case owner within
its severity SLA, on-call coverage never lapses without a recorded handoff, and
fixes ship through coordinated, respectful disclosures.
