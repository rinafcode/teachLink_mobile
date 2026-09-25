# Mobile Permissions Policy

## Purpose

This policy defines how TeachLink Mobile asks for, records, and reviews runtime
and install-time permissions. It exists so that every permission the app holds
has a documented reason, an owner, and a review trail, and so that contributors
have a single, versioned reference for the least-permission rule.

## Scope

This policy covers every platform permission requested or declared by the
TeachLink Mobile application on iOS and Android, including but not limited to
notifications, camera and barcode scanning, foreground location, microphone and
voice recognition, biometric unlock, and secure storage access. It covers both
runtime prompts and the declarations shipped in the store listing and the
binary. It does not cover server-side credentials or API tokens, which are
governed by the security policy.

## Least-Permission Rule

- The app must request the narrowest permission that satisfies the feature:
  foreground location instead of background location, a single-use prompt at
  the moment of need instead of a prompt at launch.
- A permission may only be requested when the feature that needs it is being
  used or is being explained to the user. Prompts must not fire during
  onboarding before the feature is introduced.
- Permissions are requested one at a time, in context, after the user has been
  told what the feature does and what happens if they decline.
- Every permission must have a working denial path. A denied permission may
  degrade a feature, but it must never block authentication, course progress,
  or account access.
- Permissions that are granted but unused must be removed. An unused
  declaration is treated the same as a new request.
- Background variants of a permission are prohibited unless the feature cannot
  be delivered any other way and the exception is recorded under Justification
  below.

## Justification Requirement

Every permission the app requests or declares carries a written justification
that is reviewed with the code that introduces it. The justification must
record:

- the user-visible feature that requires the permission, named concretely;
- why a narrower permission, or no permission, cannot deliver that feature;
- the data the app reads while the permission is held, and where it is stored;
- what the user sees when the permission is requested, and what happens when
  it is denied or later revoked; and
- the owner accountable for the permission and the review date.

Justifications live with the permission inventory maintained in this document.
A pull request that adds a permission without a justification is not
completable.

## Review Before Adding One

No new permission is added without review.

- A pull request that adds, widens, or re-prompts a permission must be reviewed
  by the mobile platform owner and the security or privacy reviewer before
  merge. The reviewer checks the justification against the least-permission
  rule above.
- The pull request updates the permission inventory in this document in the
  same change, so the inventory never lags the code.
- The pull request records the platforms affected, the prompt copy shown to
  the user, and the manual test performed with the permission denied.
- A permission may ship behind a feature flag while it is evaluated, but the
  flag does not replace review.
- Removals and downgrades follow the same path in reverse: the inventory entry
  and the declaration are removed together.

## Runtime Request Rules

- Request at the point of use, never preemptively at app start.
- Explain the feature before the platform dialog appears, so the prompt is
  never the first thing the user learns about the feature.
- Honour the platform decision. If the user denies, do not re-prompt in a
  loop; send the user to the platform settings screen instead.
- Re-check permission state whenever the app returns to the foreground, and
  update the in-app permission surface so the current state is visible.
- Revoking a permission in system settings must leave the app in a stable
  state with no crashes, no blocked core journeys, and no stale cached data
  from that permission.

## Permission Inventory

The inventory below lists the permissions currently requested by the app, each
with its justification summary and owner. It is updated in the same pull
request that changes a permission.

| Permission          | Feature                                      | Justification summary                                            | Owner             |
| ------------------- | -------------------------------------------- | ---------------------------------------------------------------- | ----------------- |
| Notifications       | Reminders and course updates                 | Delivery of reminders the user opts into                         | Mobile platform   |
| Camera              | QR code scanning and profile photo capture   | Scanning and capture cannot work without camera access           | Mobile platform   |
| Foreground location | Location-aware content and nearby context    | Foreground only; no background collection                        | Mobile platform   |
| Microphone          | Voice recognition and pronunciation practice | Speech input requires the microphone while the feature is active | Mobile platform   |
| Biometric unlock    | Optional fast sign-in                        | Convenience only; a non-biometric fallback always remains        | Auth and security |

## Regression Tests Where Applicable

Permission behaviour that can be exercised in tests is covered by automated
tests, so that a change to the permission flow fails loudly rather than
silently:

- Hook and service tests assert that each permission is requested only from
  its own entry point and that a denied response is returned as a fallback
  state rather than an error.
- Component tests cover the permission explanation surfaces, the denied state,
  and the route to platform settings.
- Manual regression runs cover the device matrix: grant, deny, and revoke in
  system settings, each time confirming the denial path still works.

Tests that assert on permission behaviour live with the code that requests the
permission. This policy is documentation; it adds no runtime code and
therefore no executable test of its own.

## Ownership and Review

The mobile platform owner, with the security and privacy reviewers, owns this
policy and reviews it on a regular cadence and whenever a new permission is
added.

Changes to this policy are proposed in a pull request that touches only the
`Governance/` folder.

## Success

This policy succeeds when every permission the app holds has a current
justification and a named owner, no prompt appears before the feature is
explained, denials never block a core journey, and the inventory matches what
the binary actually requests.

## Change Log

- 2026-09-25 — initial version, adding this document to close the governance
  gap tracked in issue #1308.
