# Android ProGuard / R8 Configuration

Closes [#239](https://github.com/rinafcode/teachLink_mobile/issues/239).

## Overview

Production Android builds use R8 (via `expo-build-properties`) to minify, obfuscate, and shrink the native Java/Kotlin layer. Custom keep rules in `proguard-rules.pro` prevent runtime crashes from over-aggressive stripping of React Native, Expo, and third-party native modules.

**Expected impact:**

| Metric        | Before       | Target        |
| ------------- | ------------ | ------------- |
| APK size      | ~120 MB      | ~78 MB (−35%) |
| Cold start    | baseline     | −10–15%       |
| Code exposure | unobfuscated | obfuscated    |

## Configuration

### `eas.json` — production profile

- `NODE_ENV=production` ensures Metro and Babel apply production optimizations.
- `buildType: "apk"` for measurable APK size during CI/preview builds.

### `app.json` — build plugins

```json
[
  "./plugins/withProguard.js",
  [
    "expo-build-properties",
    {
      "android": {
        "enableMinifyInReleaseBuilds": true,
        "enableShrinkResourcesInReleaseBuilds": true
      }
    }
  ]
]
```

- `enableMinifyInReleaseBuilds` — enables R8 code shrinking and obfuscation (replaces deprecated `enableProguardInReleaseBuilds` in SDK 54+).
- `enableShrinkResourcesInReleaseBuilds` — removes unused Android resources (requires minify).

### `proguard-rules.pro`

Root-level keep rules copied into `android/app/proguard-rules.pro` at prebuild by `plugins/withProguard.js`.

| Library                                | Scope                            | Notes                                      |
| -------------------------------------- | -------------------------------- | ------------------------------------------ |
| React Native                           | Native (`com.facebook.react.**`) | Core bridge, Hermes, Yoga                  |
| Expo                                   | Native (`expo.modules.**`)       | All Expo modules                           |
| Zustand                                | JavaScript only                  | No ProGuard rules needed; handled by Metro |
| Axios                                  | Native OkHttp/Okio               | JS client is bundled by Metro              |
| Reanimated / Gesture Handler / Screens | Native                           | Required to avoid animation crashes        |
| Sentry                                 | Native (`io.sentry.**`)          | Crash reporting must survive obfuscation   |
| react-native-iap                       | Native billing classes           | Play Billing API keep rules                |

## Verifying R8 is active

After `npx expo prebuild --platform android`, confirm in `android/app/build.gradle`:

```gradle
release {
    minifyEnabled true
    shrinkResources true
}
```

EAS production builds apply these automatically.

## Measuring APK size

```bash
# Build production APK via EAS
npm run build:android

# Or local release build after prebuild
npx expo prebuild --platform android
cd android && ./gradlew assembleRelease
ls -lh app/build/outputs/apk/release/
```

Compare against the ~120 MB baseline documented in issue #239.

## Testing after rule changes

1. Run `npm test -- proguardConfig` to validate configuration files.
2. Build a release APK and smoke-test:
   - Login / registration (Axios networking)
   - Course playback (Expo Video)
   - Quiz flow (Zustand stores)
   - Push notifications
   - In-app purchases (if enabled)
3. Check Sentry for new native crash signatures after release.

## Maintenance

When adding a dependency with **native Android code**:

1. Build a release APK and test the feature.
2. If a `ClassNotFoundException` or `NoSuchMethodError` appears, add a `-keep` rule to `proguard-rules.pro`.
3. Re-run prebuild and rebuild.
4. Document the new rule in the table above.

**Do not** add blanket `-keep` rules for entire packages unless required — they defeat size reduction.

## Related issues

- #25, #26, #27 — prior build optimization work
- #31, #34, #78 — performance testing and budgets
