# Moderator Role

## Purpose

This document defines the moderator role for TeachLink Mobile. It gives
contributors and maintainers a single, versioned reference for moderator duties,
powers and limits, and how a moderator is appointed or removed.

## Scope

A moderator acts in the project's public collaboration spaces: issues, pull
request discussion, GitHub Discussions, and other project-managed channels that
the maintainers designate. The role exists to keep those spaces usable, on topic,
and consistent with the project's community and conduct expectations.

This role does not replace the processes that already own a subject. Conduct
appeals follow the [Conflict Resolution](../processes/CONFLICT_RESOLUTION.md)
process. Technical objections follow
[Objection Handling](../processes/OBJECTION_HANDLING.md). Security reports follow
the [Vulnerability Disclosure Process](../processes/VULN_DISCLOSURE.md) and the
[Security Response Team Charter](../SECURITY_RESPONSE_TEAM.md). Issue
classification follows [Issue Triage](../processes/TRIAGE.md). Escalation of
stalled work follows the [Escalation Path](../processes/ESCALATION_PATH.md).

Application code, CI, and tests are unchanged by this document. There is no
runtime behaviour to regression-test; policy changes are reviewed as
documentation in pull requests that touch only the `Governance/` folder.

## Duties

A moderator:

- Watches public project spaces for spam, off-topic threads, harassment, and
  other conduct that makes participation unsafe or unusable.
- Intervenes early and in writing: a warning, a request to edit, or a
  conversation lock, with a short public note of what was done and why, omitting
  private details.
- Applies existing labels and routing when a thread is spam, a duplicate, or a
  conduct matter that needs a dedicated process. The moderator does not invent
  labels outside the [Label Taxonomy](../LABEL_TAXONOMY.md).
- Recuses from any thread where they are a party, a material contributor to the
  disputed work, or otherwise unable to act neutrally, and names another
  moderator or a maintainer.
- Escalates promptly to the community lead and the maintainers when the matter
  may require a sanction beyond the powers below, or when the moderator is
  unsure.
- Keeps a durable record of moderation actions on the thread or, for sensitive
  cases, in the project's private conduct channel, so an appeal can be reviewed.
- Does not use the role to decide the technical outcome of a change. Review and
  merge follow the [Code Review Policy](../policies/REVIEW_POLICY.md).

## Powers

A moderator may:

- Hide or request removal of comments that are spam, abusive, or that disclose
  private information, and ask the author to restate the substance without the
  violating content.
- Lock a conversation that has become unproductive or harmful, stating the
  reason and how it can be reopened.
- Close an issue or discussion that is solely spam or a clear duplicate of an
  already-linked canonical thread, without closing a good-faith contribution
  solely because it is contested.
- Temporarily restrict a participant's ability to comment in project spaces
  pending a maintainer or community-lead decision, when continuing participation
  would cause further harm. The restriction is recorded and time-bounded.
- Redirect a report to the correct process (conflict resolution, security
  advisory, or triage) instead of handling it as ordinary discussion.

## Limits

A moderator may not:

- Permanently ban a participant, impose a long-term sanction, or rewrite a code
  of conduct decision. Those outcomes belong to the community lead and the
  maintainers under
  [Conflict Resolution](../processes/CONFLICT_RESOLUTION.md).
- Merge, approve, or dismiss review on a pull request by virtue of this role.
  A person who is also a reviewer or maintainer acts under that other role and
  its independence rules.
- Access private security advisories, embargo lists, or signing-key material
  unless they separately hold a role defined in the
  [Security Response Team Charter](../SECURITY_RESPONSE_TEAM.md) or
  [App Signing Keys](../domains/APP_SIGNING_KEYS.md).
- Change governance documents, labels, or project settings except as an ordinary
  contributor through a pull request that follows
  [Governance](../README.md).
- Override a maintainer's technical decision, a triage priority that the
  maintainer group has recorded, or an embargo.
- Share private reports, personal data, or moderation notes outside the people
  who need them to act.
- Moderate a thread in which they have a conflict of interest.

Temporary restrictions expire unless the community lead or maintainers extend or
convert them through the conduct process. Anyone affected may appeal as described
in [Conflict Resolution](../processes/CONFLICT_RESOLUTION.md).

## Appointment

- Anyone may nominate a moderator by opening a public issue that names the
  person, describes their history of constructive participation, and confirms
  they accept the duties and limits in this document.
- Appointment requires a second from a maintainer who is not the nominee, then
  consensus of the maintainers or, if consensus is not reached, a majority with
  a dissenting note. Self-appointment is not used.
- The nominee must be an established contributor in good standing: they follow
  the code of conduct, they are not the subject of an open conduct case, and they
  can recuse when needed.
- The decision is recorded on the nomination issue. The role begins when that
  record is posted. There is no separate private roster; the issue is the
  artifact that identifies who currently serves.
- Appointment is ongoing until resignation or removal. Moderators are reviewed
  at least annually by the community lead and the maintainers.

## Removal

- A moderator may resign at any time by commenting on the appointment issue or
  opening a short follow-up issue. Resignation takes effect when acknowledged by
  a maintainer.
- A maintainer or the community lead may propose removal for inactivity,
  repeated overreach, a conflict of interest that cannot be managed by recusal,
  or a code of conduct violation.
- Removal is decided by the maintainers excluding the moderator under review.
  Serious conduct concerns may result in immediate suspension of moderation
  powers pending that decision.
- The outcome is recorded on the appointment or removal issue, with private
  details omitted. The former moderator may appeal through
  [Conflict Resolution](../processes/CONFLICT_RESOLUTION.md).
- After removal or resignation, the person no longer holds the powers in this
  document. Remaining moderators and the maintainers cover the gap until a
  replacement is appointed if one is needed.

## Ownership and Review

The community lead and the maintainers own this role definition and review it
annually, and after any moderation action that is appealed or that reaches the
maintainer group.

Changes are proposed in a pull request that touches only the `Governance/`
folder.

## Success

This role succeeds when public project spaces stay usable without ad-hoc
enforcement, every moderation action is recorded and appealable, and moderators
stay within the powers and limits written here.
