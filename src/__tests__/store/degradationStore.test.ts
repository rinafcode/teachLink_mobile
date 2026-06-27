/**
 * Unit tests for degradationStore
 *
 * The primary regression guard here is the serialize → rehydrate round-trip:
 * before this fix, `degradedFeatures` was typed as `Set<FeatureType>`, and
 * `JSON.stringify(new Set([...]))` produces `{}` — an empty object — meaning
 * every app restart silently wiped all disabled-feature flags.
 *
 * These tests exercise:
 * 1. JSON round-trip: persisted `degradedFeatures` array is preserved after
 *    serialize → parse.
 * 2. `isFeatureDegraded` returns the correct value before and after
 *    `setFeatureStatus`.
 * 3. `getDegradedFeatures` returns accurate list.
 * 4. `selectDegradedFeaturesSet` selector produces a proper Set from state.
 * 5. `setFeatureStatus` correctly adds and removes features without duplicates.
 */

import { FeatureStatus, FeatureType } from '../../services/featureCapabilities';
import { selectDegradedFeaturesSet, useDegradationStore } from '../../store/degradationStore';

// Helper: snapshot the full store state
const getStore = () => useDegradationStore.getState();

// Reset the store to a clean slate before every test so tests don't bleed into
// each other.
beforeEach(() => {
  useDegradationStore.setState({
    degradedFeatures: [],
    featureStatuses: {
      [FeatureType.CAMERA]: FeatureStatus.UNAVAILABLE,
      [FeatureType.PUSH_NOTIFICATIONS]: FeatureStatus.UNAVAILABLE,
      [FeatureType.LOCATION]: FeatureStatus.AVAILABLE,
    },
    notifications: [],
    preferences: {
      showDegradationBanners: true,
      autoDismissDegradationAlerts: true,
      remindPermissionRetry: true,
      enableFallbackUX: true,
      respectRemoteFlags: true,
    },
  });
});

// ---------------------------------------------------------------------------
// Serialize / rehydrate round-trip (primary regression guard)
// ---------------------------------------------------------------------------
describe('JSON serialize → rehydrate round-trip', () => {
  it('preserves degradedFeatures entries after JSON.stringify → JSON.parse', () => {
    // Mark camera as permission-denied so it enters the degradedFeatures list.
    getStore().setFeatureStatus(FeatureType.CAMERA, FeatureStatus.PERMISSION_DENIED);
    getStore().setFeatureStatus(FeatureType.PUSH_NOTIFICATIONS, FeatureStatus.HARDWARE_UNAVAILABLE);

    // Simulate what Zustand persist does: JSON.stringify the partialised state.
    const rawState = getStore();
    const partialised = {
      degradedFeatures: rawState.degradedFeatures,
      featureStatuses: rawState.featureStatuses,
      preferences: rawState.preferences,
      notifications: rawState.notifications,
    };

    const serialised = JSON.stringify(partialised);
    const rehydrated = JSON.parse(serialised) as typeof partialised;

    // The rehydrated value must still be a proper array (not `{}` or `[]`).
    expect(Array.isArray(rehydrated.degradedFeatures)).toBe(true);
    expect(rehydrated.degradedFeatures).toHaveLength(2);
    expect(rehydrated.degradedFeatures).toContain(FeatureType.CAMERA);
    expect(rehydrated.degradedFeatures).toContain(FeatureType.PUSH_NOTIFICATIONS);
  });

  it('produces an empty array (not {}) for degradedFeatures when no feature is degraded', () => {
    // Start clean — all statuses from beforeEach have LOCATION as AVAILABLE but
    // CAMERA and PUSH_NOTIFICATIONS as UNAVAILABLE, so those two are already
    // degraded from the initial defaults.  Reset them to AVAILABLE for this test.
    getStore().setFeatureStatus(FeatureType.CAMERA, FeatureStatus.AVAILABLE);
    getStore().setFeatureStatus(FeatureType.PUSH_NOTIFICATIONS, FeatureStatus.AVAILABLE);

    const serialised = JSON.stringify({ degradedFeatures: getStore().degradedFeatures });
    const parsed = JSON.parse(serialised) as { degradedFeatures: unknown };

    // Must be an array, not `{}`.
    expect(Array.isArray(parsed.degradedFeatures)).toBe(true);
    expect(parsed.degradedFeatures).toHaveLength(0);
  });

  it('app restart does not reset disabled features — rehydrating state preserves them', () => {
    getStore().setFeatureStatus(FeatureType.CAMERA, FeatureStatus.PERMISSION_DENIED);

    // Simulate Zustand rehydrating: take the serialised value and push it back.
    const serialisedDegradedFeatures: FeatureType[] = JSON.parse(
      JSON.stringify(getStore().degradedFeatures)
    );

    // Simulate a "fresh boot" where degradedFeatures starts empty.
    useDegradationStore.setState({ degradedFeatures: [] });
    expect(getStore().degradedFeatures).toHaveLength(0);

    // Now apply the rehydrated value (as Zustand persist would).
    useDegradationStore.setState({ degradedFeatures: serialisedDegradedFeatures });

    expect(getStore().degradedFeatures).toContain(FeatureType.CAMERA);
    expect(getStore().degradedFeatures).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// isFeatureDegraded
// ---------------------------------------------------------------------------
describe('isFeatureDegraded', () => {
  it('returns false for a feature that is AVAILABLE', () => {
    getStore().setFeatureStatus(FeatureType.LOCATION, FeatureStatus.AVAILABLE);
    expect(getStore().isFeatureDegraded(FeatureType.LOCATION)).toBe(false);
  });

  it('returns true after status is set to PERMISSION_DENIED', () => {
    getStore().setFeatureStatus(FeatureType.CAMERA, FeatureStatus.PERMISSION_DENIED);
    expect(getStore().isFeatureDegraded(FeatureType.CAMERA)).toBe(true);
  });

  it('returns true after status is set to HARDWARE_UNAVAILABLE', () => {
    getStore().setFeatureStatus(FeatureType.PUSH_NOTIFICATIONS, FeatureStatus.HARDWARE_UNAVAILABLE);
    expect(getStore().isFeatureDegraded(FeatureType.PUSH_NOTIFICATIONS)).toBe(true);
  });

  it('returns true after status is set to UNAVAILABLE', () => {
    getStore().setFeatureStatus(FeatureType.CAMERA, FeatureStatus.UNAVAILABLE);
    expect(getStore().isFeatureDegraded(FeatureType.CAMERA)).toBe(true);
  });

  it('returns false after a previously-degraded feature is restored to AVAILABLE', () => {
    getStore().setFeatureStatus(FeatureType.CAMERA, FeatureStatus.PERMISSION_DENIED);
    expect(getStore().isFeatureDegraded(FeatureType.CAMERA)).toBe(true);

    getStore().setFeatureStatus(FeatureType.CAMERA, FeatureStatus.AVAILABLE);
    expect(getStore().isFeatureDegraded(FeatureType.CAMERA)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// setFeatureStatus — degradedFeatures array integrity
// ---------------------------------------------------------------------------
describe('setFeatureStatus', () => {
  it('adds feature to degradedFeatures array when degraded', () => {
    getStore().setFeatureStatus(FeatureType.CAMERA, FeatureStatus.PERMISSION_DENIED);

    expect(getStore().degradedFeatures).toContain(FeatureType.CAMERA);
  });

  it('removes feature from degradedFeatures array when restored', () => {
    getStore().setFeatureStatus(FeatureType.CAMERA, FeatureStatus.PERMISSION_DENIED);
    getStore().setFeatureStatus(FeatureType.CAMERA, FeatureStatus.AVAILABLE);

    expect(getStore().degradedFeatures).not.toContain(FeatureType.CAMERA);
  });

  it('does not create duplicate entries if the same feature is degraded twice', () => {
    getStore().setFeatureStatus(FeatureType.CAMERA, FeatureStatus.PERMISSION_DENIED);
    getStore().setFeatureStatus(FeatureType.CAMERA, FeatureStatus.UNAVAILABLE);

    const cameraEntries = getStore().degradedFeatures.filter(f => f === FeatureType.CAMERA);
    expect(cameraEntries).toHaveLength(1);
  });

  it('updates featureStatuses record to the latest status', () => {
    getStore().setFeatureStatus(FeatureType.CAMERA, FeatureStatus.PERMISSION_DENIED);
    expect(getStore().featureStatuses[FeatureType.CAMERA]).toBe(FeatureStatus.PERMISSION_DENIED);

    getStore().setFeatureStatus(FeatureType.CAMERA, FeatureStatus.AVAILABLE);
    expect(getStore().featureStatuses[FeatureType.CAMERA]).toBe(FeatureStatus.AVAILABLE);
  });
});

// ---------------------------------------------------------------------------
// getDegradedFeatures
// ---------------------------------------------------------------------------
describe('getDegradedFeatures', () => {
  it('returns an empty array when no features are degraded', () => {
    // Clear the two initially-unavailable features so the list is truly empty.
    getStore().setFeatureStatus(FeatureType.CAMERA, FeatureStatus.AVAILABLE);
    getStore().setFeatureStatus(FeatureType.PUSH_NOTIFICATIONS, FeatureStatus.AVAILABLE);

    expect(getStore().getDegradedFeatures()).toHaveLength(0);
  });

  it('returns only the features whose status is a degraded status', () => {
    getStore().setFeatureStatus(FeatureType.CAMERA, FeatureStatus.PERMISSION_DENIED);
    getStore().setFeatureStatus(FeatureType.PUSH_NOTIFICATIONS, FeatureStatus.AVAILABLE);
    getStore().setFeatureStatus(FeatureType.LOCATION, FeatureStatus.AVAILABLE);

    const degraded = getStore().getDegradedFeatures();
    expect(degraded).toContain(FeatureType.CAMERA);
    expect(degraded).not.toContain(FeatureType.PUSH_NOTIFICATIONS);
    expect(degraded).not.toContain(FeatureType.LOCATION);
  });
});

// ---------------------------------------------------------------------------
// selectDegradedFeaturesSet selector
// ---------------------------------------------------------------------------
describe('selectDegradedFeaturesSet', () => {
  it('returns a Set containing degraded features', () => {
    getStore().setFeatureStatus(FeatureType.CAMERA, FeatureStatus.PERMISSION_DENIED);

    const degradedSet = selectDegradedFeaturesSet(getStore());
    expect(degradedSet).toBeInstanceOf(Set);
    expect(degradedSet.has(FeatureType.CAMERA)).toBe(true);
  });

  it('returns an empty Set when no features are degraded', () => {
    getStore().setFeatureStatus(FeatureType.CAMERA, FeatureStatus.AVAILABLE);
    getStore().setFeatureStatus(FeatureType.PUSH_NOTIFICATIONS, FeatureStatus.AVAILABLE);
    getStore().setFeatureStatus(FeatureType.LOCATION, FeatureStatus.AVAILABLE);

    const degradedSet = selectDegradedFeaturesSet(getStore());
    expect(degradedSet.size).toBe(0);
  });

  it('supports O(1) has() lookups', () => {
    getStore().setFeatureStatus(FeatureType.CAMERA, FeatureStatus.PERMISSION_DENIED);
    getStore().setFeatureStatus(FeatureType.PUSH_NOTIFICATIONS, FeatureStatus.AVAILABLE);

    const degradedSet = selectDegradedFeaturesSet(getStore());
    expect(degradedSet.has(FeatureType.CAMERA)).toBe(true);
    expect(degradedSet.has(FeatureType.PUSH_NOTIFICATIONS)).toBe(false);
  });
});
