# Adaptive Theme

Adaptive Theme automatically switches the app between light and dark mode based on ambient light detected by the device light sensor (Android).

## Features

### Automatic adjustment

When **Adaptive Theme** is enabled under **Settings → App**, the app reads illuminance (lux) from the device light sensor and updates the global theme in the app store.

### Hysteresis thresholds

To avoid flickering near a single cutoff, two thresholds are used:

| Transition | Condition |
|------------|-----------|
| Light → Dark | Lux falls below **25** |
| Dark → Light | Lux rises above **75** |

Readings between 25 and 75 lux are in the hysteresis band; the current theme is kept.

### Consecutive reading debounce

A theme change requires **3** consecutive readings that agree on the same target theme, with sensor updates spaced **1000 ms** apart (`LightSensor.setUpdateInterval(1000)`).

### Manual override

If the user changes **Theme** in the picker while Adaptive Theme is on, Adaptive Theme is turned off immediately so the explicit choice is respected.

### Background behavior

The light sensor subscription is removed when the app moves to the background and re-established when the app returns to the foreground (if Adaptive Theme is still enabled).

## Implementation

| Piece | Location |
|-------|----------|
| Setting | `src/store/settingsStore.ts` — `adaptiveThemeEnabled` |
| Sensor hook | `src/hooks/useAdaptiveTheme.ts` |
| Root wiring | `App.tsx` |
| UI toggle | `src/components/mobile/MobileSettings.tsx` |
| Dependency | `expo-sensors` (`LightSensor`, Android only) |

Pure debounce/hysteresis logic is exported from the hook for unit tests: `getCandidateThemeFromLux`, `advanceDebounce`.

## How to test

### Automated

```bash
npm run test -- tests/store/settingsStore.test.ts
npm run test -- tests/hooks/useAdaptiveTheme.test.ts
```

### Manual (Android device or emulator with light sensor)

1. Open **Settings → App** and confirm **Adaptive Theme** appears with a switch.
2. Enable **Adaptive Theme** and cover/uncover the sensor or move between bright and dim areas; theme should change only after stable readings (no rapid flicker).
3. With Adaptive Theme on, change **Theme** manually; the Adaptive Theme switch should turn off.
4. Background the app and confirm no crashes; return to foreground and verify adaptive behavior resumes when enabled.

**Note:** `LightSensor` is only available on Android. On iOS and web, enabling Adaptive Theme has no sensor effect.
