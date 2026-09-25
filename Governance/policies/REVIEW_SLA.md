# Code Review Service Level Agreement (SLA) Policy

This document details the Service Level Agreements (SLAs) for code reviews within the TeachLink Mobile project. The goal of this policy is to ensure that community contributions are respected and reviewed in a timely manner while providing maintainers with realistic and sustainable expectations.

## 1. Scope & Exceptions

- **In Scope:** All Pull Requests (PRs) opened against the main repository that are marked as "Ready for Review".
- **Out of Scope / Exceptions:**
  - **Draft PRs:** SLAs do not apply to PRs marked as Draft. The timer starts when the PR is marked as "Ready for Review".
  - **Weekends and Public Holidays:** All SLA targets are measured in business hours (Monday-Friday) according to the PR author's and reviewer's overlapping timezones.
  - **Major Releases:** During major release freezes, SLA targets may be temporarily suspended.

## 2. First-Response Target

**Target:** 48 Business Hours

All new Pull Requests must receive an initial response from a maintainer or designated reviewer within **48 hours** of being marked as ready.

A valid "First-Response" includes:

- A preliminary code review comment.
- Asking clarifying questions regarding the implementation or PR description.
- Assigning the PR to a specific domain expert for further review.
- Acknowledgment of the PR and providing an ETA for a full review.

## 3. Review-Completion Target

**Target:** 7 Business Days

Once a review has commenced, the target time for concluding the review process is **7 days**.

A valid "Review-Completion" is reached when the PR is:

- **Approved** and ready to merge.
- **Merged** directly by the maintainer.
- **Closed** with a clear explanation of why the change is not being accepted.
- Blocked on the author (e.g., requested changes that the author has not yet addressed). In this case, the SLA is paused until the author responds.

## 4. Escalation Process

In a volunteer-driven or asynchronous project, SLAs may occasionally be missed. If a PR misses either the first-response or review-completion target, the following escalation steps should be followed:

### Step 1: Polite Ping

The PR author should politely ping the requested reviewers or the maintainer team directly in the PR comments.
_Example: "@reviewer-name, just a gentle ping on this PR when you have a moment!"_

### Step 2: Core Team Escalation

If there is no response within **24 hours** after the initial ping, the author may escalate the issue to the core maintainers.

- Tag `@core-team` or the designated project lead in the PR comments.
- Reach out via the official community channels (e.g., Slack, Discord) in the `#contributions` or `#maintainers` channel.

## 5. Continuous Improvement

The maintainer team tracks SLA metrics periodically to identify bottlenecks in the review pipeline. If specific areas of the codebase are consistently missing SLAs, we will actively look into bringing on additional reviewers or simplifying the review requirements for those domains.
