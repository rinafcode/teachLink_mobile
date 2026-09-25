# App Signing Key Policy

## Purpose

This policy defines who may hold, use, and rotate the cryptographic material that
signs TeachLink Mobile builds. A signing key is the project's proof of authorship:
whoever holds it can produce an update that Android and iOS will install over the
genuine app. Losing it can block store updates, and leaking it can hand an attacker
the ability to ship malware under the TeachLink identity. The rules below exist so
that custody stays deliberate, access stays limited, and every rotation is
traceable.

## Scope

This policy covers the signing material used by the repository's Expo/EAS build and
submit pipeline:

- the Android upload keystore (`.jks` / `.keystore`) registered with EAS;
- the iOS distribution certificate (`.p12` / `.cer`) and its private key;
- the iOS provisioning profile (`.mobileprovision`);
- the App Store Connect API key (`.p8`) used for iOS submission;
- the Google Play service-account key JSON referenced by `eas.json` as
  `serviceAccountKeyPath`;
- the Expo access token (`EXPO_TOKEN`) that authorises EAS to read the above on the
  project's behalf.

It does not cover SSL/TLS certificate pins; those are handled in `SECURITY.md`.
Nor does it cover the Google Play *app signing key*, which is held by Google and is
outside the project's control (see the rotation section).

## Signing Model in This Repository

TeachLink Mobile is an **Expo managed (SDK 54) application**, so native signing is
delegated to **EAS Build**. There is no committed `android/` or `ios/` project:
both directories are generated and are ignored by `.gitignore` (`/android`, `/ios`).
That means every signing decision lives in `eas.json`, in EAS credentials, and in
the CI workflow that invokes EAS — not in a checked-in Gradle or Xcode project.

Authoritative files:

| File | Role in signing |
| --- | --- |
| `eas.json` | Declares the `development`, `preview`, and `production` build profiles and the `submit.production` store credentials. Android release output is produced by `:app:bundleRelease` (AAB) for `production` and `:app:assembleRelease` (APK) for `preview`; iOS uses `buildConfiguration: "Release"`. |
| `app.config.ts` | Sets version/build numbers only. It must not carry signing identities, keystores, or passwords. |
| `.github/workflows/release.yml` | Runs the production path: `eas build --platform all --profile production --non-interactive --no-wait`, then `eas submit --platform android --profile production` and `eas submit --platform ios --profile production`. Authenticates with `expo/expo-github-action@v8` and the `EXPO_TOKEN` repository secret. |
| `.github/workflows/build-native.yml` | Runs local, cached builds: `eas build --platform android|ios --profile <profile> --non-interactive --local --output ./build-output`, also using `secrets.EXPO_TOKEN`. |
| `scripts/deploy-android.sh`, `scripts/deploy-ios.sh` | Developer-initiated production builds: `eas whoami`, `eas build --platform ... --profile production`, `eas submit --platform ... --profile production`. |
| `.gitignore` | The last line of defence against committing key material. |

Custody by default is the **EAS credential store** on Expo's servers, reached
through `eas credentials` or the Expo dashboard. CI never receives a keystore file
directly; it receives `EXPO_TOKEN`, and EAS performs the signing on the project's
behalf. Local `--local` builds in `build-native.yml` are the one path where signing
material may be materialised on a runner, so they follow the same access rules as a
maintainer's machine.

## Key Custody Rules

- Signing material is **never committed** to the repository, in any form: no
  keystore, no `.p8`/`.p12`/`.mobileprovision`, no base64 blobs, no passwords,
  no credentials pasted into an issue, pull request, log, screenshot, or build
  artifact.
- Keys are held in the **EAS credential store** for this project, or in the
  approved organisation secret store. Contributors do not keep personal copies.
- `eas.json` and `app.config.ts` reference credentials by **path or identifier
  only**. The `submit.production` block in `eas.json` must keep placeholder values
  (`your-apple-id@example.com`, `your-apple-team-id`, and so on); real values are
  injected at submit time.
- The Google Play service-account JSON named by
  `serviceAccountKeyPath` in `eas.json` is supplied out of band. Its real path must
  be covered by `.gitignore` before it is ever created locally, and the file must
  never be added with `git add -f`.
- `.gitignore` already blocks the common signing file types — `*.jks`, `*.p8`,
  `*.p12`, `*.key`, `*.mobileprovision`, `*.pem` — along with `.env`, `.env*.local`,
  the generated `/android` and `/ios`, and build outputs `*.apk`, `*.aab`, and
  `*.ipa`. Removing or loosening any of these patterns requires the review described
  under Ownership and Review.
- The `EXPO_TOKEN` value lives only in GitHub Actions secrets. It is read as
  `${{ secrets.EXPO_TOKEN }}` and is never echoed, printed, or written to a file in
  a workflow step.

## Access Limits

- Access is **least-privilege and role-based**. Only maintainers with a release
  responsibility receive EAS project access or the ability to read `EXPO_TOKEN`.
- The set of people who can export or replace a signing key is kept as small as the
  release process allows, and is reviewed when the release team changes.
- Credentials are **personal and non-transferable**. Sharing an Expo account,
  `EXPO_TOKEN`, keystore, or App Store Connect key with another person is
  prohibited, including over private chat or a shared drive.
- Contributors and reviewers may request a build but may not read, export, or copy
  the underlying material. Reviewers of a `Governance/` pull request do not need
  key access to approve it.
- Access is **revoked on offboarding** and whenever a device that could read the
  material is lost, stolen, or otherwise compromised.
- Local development uses the `development` and `preview` profiles, which are not
  store-signing paths. The `production` profile is exercised only by the release
  pipeline, never from an unmanaged workstation.

## Rotation Process

**Scheduled rotation.** Signing material is rotated on a defined cadence agreed by
the release team (at minimum annually), and the rotation is recorded in the release
notes for the build that carries the new key.

**Immediate rotation triggers.** Rotate without waiting for the schedule when any
of the following occurs:

- a key, keystore, `EXPO_TOKEN`, or store API key is suspected or confirmed exposed;
- a holder leaves the team, or their laptop or account is compromised;
- there is evidence of an unauthorised build, upload, or credential use.

**Android (upload keystore).**

1. A release maintainer opens `eas credentials --platform android` and creates a
   replacement upload keystore for the project.
2. The new keystore is registered with Google Play. Because Play App Signing is
   enabled, the **upload key** is what the project holds and rotates; Google
   retains and, if ever required, rotates the **app signing key** that end users
   actually trust.
3. A `preview` build is produced and installed to confirm the app is accepted
   before the `production` bundle is promoted.
4. The previous upload keystore is retired in EAS only after Google Play accepts a
   build signed with the new key.

**iOS (certificate and provisioning profile).**

1. A release maintainer uses `eas credentials --platform ios` to generate a
   replacement distribution certificate and to regenerate the provisioning profile
   bound to it.
2. The `appleId`, `ascAppId`, and `appleTeamId` values used by
   `eas submit --platform ios --profile production` are confirmed to still match
   the App Store Connect record.
3. The replacement `.p8` App Store Connect API key is issued in App Store Connect,
   installed in the approved secret store, and the superseded key is revoked.
4. A TestFlight/`preview` submission validates the new certificate before the
   production submission runs.

**Verification and rollback.** Each rotation ends with a signed `preview` build
that installs on a device and one successful store submission. The superseded key
is retained, in the secure store only, until that submission is accepted, so a
failed rotation can be reversed without a store outage. No rotation is complete
until the new key is confirmed in EAS credentials and the old one is either
retired or explicitly marked as superseded.

## Exposure Response

- A suspected exposure is treated as a security incident: it is reported through
  the private channel in
  [VULN_DISCLOSURE.md](../processes/VULN_DISCLOSURE.md), never as a public issue or
  pull request.
- The affected key is rotated immediately using the process above. Removing a
  build or a commit is not a remedy; only rotation restores trust in the signing
  identity.
- Affected builds, uploads, and store records are reviewed for unauthorised
  activity, and the disclosure is handled under the project's embargo policy.

## Enforcement Checks

The policy is enforced through review rather than through application code, because
there is nothing to test at runtime:

- **Pull-request review.** Every pull request is checked for signing material in the
  diff. Any new keystore, key, profile, or credential JSON is a blocking finding.
- **Ignore-rule audit.** Before a release, confirm the sensitive patterns are still
  ignored:

  ```bash
  git check-ignore -v --no-index android-service-account-key.json \
    app-release.jks distribution.p12 AuthKey.p8 app.mobileprovision .env
  git ls-files | grep -Ei '\.(jks|keystore|p8|p12|mobileprovision|key|pem)$'
  ```

  The first command must report a matching ignore rule for each path; the second
  must return no tracked key files.
- **Force-add discipline.** `.gitignore` ignores `*.md` except `README.md`,
  `CONTRIBUTING.md`, and `docs/**/*.md`, so `Governance/` documents are tracked
  because they were force-added. A `git add -f` that reaches outside that documented
  exception is a review blocker, precisely because force-add is how ignored key
  material could slip into a commit.
- **Diff hygiene.** A pull request that touches `eas.json`, `.github/workflows/`,
  `scripts/deploy-*.sh`, or `.gitignore` is routed to a mobile platform maintainer
  and a release owner, per the build-profile ownership rules in
  [EAS_BUILD_GOVERNANCE.md](./EAS_BUILD_GOVERNANCE.md).

## Ownership and Review

The release-management team owns this policy and the signing credentials it
describes. The security lead is consulted on any exposure or unscheduled rotation.
The policy is reviewed whenever the signing model changes — for example a move from
EAS-managed credentials to self-managed credentials, a new store, a new submission
path, or a change to `.gitignore` patterns.

Changes to this document are proposed in a pull request that touches only the
`Governance/` folder, and the pull request must not include key material of any kind.

## Success

This policy succeeds when the only copies of TeachLink's signing material live in
the approved credential store, no key ever reaches the repository or a log, access
is limited to the maintainers who need it and revoked when they no longer do, and
every rotation is preceded by a verified build and recorded in the release history.
