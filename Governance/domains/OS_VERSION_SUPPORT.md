# OS Version Support Policy

## Purpose

This policy defines the minimum operating-system versions that TeachLink Mobile
supports, the criteria used to drop a version from support, and the notice period
required before removal takes effect. It gives contributors, maintainers, and
downstream integrators a versioned reference for platform compatibility decisions.

## Scope

This policy covers the iOS and Android applications built from this repository
with Expo SDK 54 and React Native 0.81, distributed through the `development`,
`preview`, and `production` profiles in `eas.json`. It applies to every change
that references platform APIs, deployment targets, or build configuration.

## Minimum Supported Versions

TeachLink Mobile currently targets:

- iOS 15.1 as the minimum supported version. Devices running iOS 15.1 or later
  with active vendor security updates receive full support.
- Android 7.0 (API level 24) as the minimum supported version. Devices running
  Android 7.0 or later with active vendor security updates receive full support.

These floors are set by the Expo SDK 54 support window and the React Native 0.81
runtime. Raising the minimum version requires updating this document and following
the drop criteria and notice period defined below.

## Drop Criteria

A minimum OS version may be raised when one or more of the following conditions
is met:

- The upstream Expo SDK or React Native release that the project adopts no longer
  supports the version. The project must not ship a build targeting an OS version
  below the Expo SDK floor.
- The platform vendor has ended security updates for the version and its adoption
  among active TeachLink users has fallen below one percent of sessions recorded
  in the preceding 90-day period.
- A required platform API, security feature, or store-submission requirement
  becomes unavailable or blocked on the version and no viable workaround exists
  within the current SDK.
- A critical security vulnerability cannot be mitigated on the version without
  abandoning the affected OS tier, and the security team determines that continued
  support creates unacceptable risk.

Meeting a criterion opens a tracking issue and starts the notice period. Meeting
none of the criteria is sufficient reason to keep support, even if the version is
older than the current minimum for a comparable app.

## Notice Period

A minimum-version increase follows the deprecation policy and requires at least
90 calendar days of advance notice. Notice starts when a tracking issue is opened
with the affected OS range, the reason for removal, the planned removal version or
date, and any migration or support messaging for affected users.

The 90-day period may be shortened only when a security-driven removal is approved
by the security team and the release owner, with the reason and approver documented
in the tracking issue. Emergency exceptions follow the same process as defined in
the Deprecation Policy.

During the notice period the affected OS range retains Tier 1 or Tier 2 status as
defined in the Device Support Policy. Defects are still triaged and critical issues
fixed unless the security team determines that doing so creates unacceptable risk.

## Communication and Tracking

When a drop decision is made, the following steps are completed before the removal
version ships:

- A tracking issue is opened and linked from the pull request or release issue.
- The `CHANGELOG.md` and release notes identify the version range being dropped,
  the first app version that removes support, and the reason.
- An in-app notice or app-store description update is published where the OS tier
  is user-facing.
- The Device Support Policy and this document are updated in the same pull request
  as the tracking-issue link, before or alongside the removal change.

## Ownership and Review

The mobile platform team owns this policy with the release-management team. The
policy is reviewed when the project adopts a new Expo SDK, when React Native
releases a new minimum-OS announcement, or when an OS version meets the drop
criteria above.

Changes to this policy are proposed in a pull request that touches only the
`Governance/` folder.

## Success

This policy succeeds when the minimum-OS floor is always explicit and versioned,
users on affected OS versions receive advance notice before support is removed, and
every minimum-version change is traceable to a documented criterion and a completed
notice period.
