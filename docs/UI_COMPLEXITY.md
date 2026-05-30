# UI Complexity Adaptation (device capability)

This app adapts UI motion/effects based on device capability to improve performance on low-end devices and provide a richer experience on capable devices.

## Complexity levels

The classifier outputs one of:

- **low**
- **mid**
- **high**

### Inputs

The classifier uses:

- **Device age class** (`expo-device.deviceYearClass`)
- **Total system RAM** (`expo-device.totalMemory`)
- **Power saver** (`expo-battery.useLowPowerMode()`)

### Thresholds

Defined in `src/hooks/useDeviceUiComplexity.ts`:

- **Low-end year threshold**: `deviceYearClass < 2018`
- **Low-end RAM threshold**: `totalMemoryBytes < 2GB`
- **Mid RAM range**: `2GB <= totalMemoryBytes < 4GB`
- **High**: `totalMemoryBytes >= 4GB` (or when RAM is unknown, falls back to high)

### Power saver behavior

If **battery saver** is enabled, the classifier forces **low** complexity regardless of RAM/year.

## Mapping to UI policies

| Level    | `shouldReduceAnimations` | `shouldDisableHeavyEffects` | `animationTargetFPS` | `animationDurationMultiplier` |
| -------- | ------------------------ | --------------------------- | -------------------- | ----------------------------- |
| **low**  | `true`                   | `true`                      | 30                   | 2                             |
| **mid**  | `true`                   | `true`                      | 45                   | 1.5                           |
| **high** | `false`                  | `false`                     | 60                   | 1                             |

## Where it's used

- `useDeviceUiComplexity()` is the unified source of truth.
- `useAdaptiveFrameRate()` is a backwards-compatible wrapper that maps to the legacy `targetFPS` (30|60) and `durationMultiplier` (1|2) API.

## Components using shouldDisableHeavyEffects

| Component                                  | Effect gated                                                                        |
| ------------------------------------------ | ----------------------------------------------------------------------------------- |
| `components/parallax-scroll-view.tsx`      | Parallax scroll transform (translateY + scale) disabled on low/mid                  |
| `src/components/mobile/LessonCarousel.tsx` | LinearGradient on progress bar and nav buttons replaced with flat colour on low/mid |

## Analytics monitoring

Every time `useDeviceUiComplexity()` mounts (or the classified level changes), it fires a `device_complexity_assigned` analytics event:

| Property               | Type                       | Description                                      |
| ---------------------- | -------------------------- | ------------------------------------------------ |
| `complexity_level`     | `'low' \| 'mid' \| 'high'` | Assigned complexity tier                         |
| `is_low_end_device`    | `boolean`                  | True when year class or RAM is below threshold   |
| `is_battery_saver`     | `boolean`                  | True when Low Power / Power Saver mode is active |
| `animation_target_fps` | `30 \| 45 \| 60`           | Target FPS for this session                      |
| `device_year_class`    | `number \| undefined`      | Raw year class from expo-device                  |

Use this event to monitor device distribution across your user base and tune thresholds over time.
