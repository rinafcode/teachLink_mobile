import * as Location from 'expo-location';
import { AppState } from 'react-native';

import { FeatureStatus, FeatureType } from '../../services/featureCapabilities';
import { locationService } from '../../services/locationService';
import { useDegradationStore } from '../../store/degradationStore';
import { useLocationStore } from '../../store/locationStore';

jest.mock(
  'expo-location',
  () => ({
    __esModule: true,
    requestForegroundPermissionsAsync: jest.fn(),
    getForegroundPermissionsAsync: jest.fn(),
    getCurrentPositionAsync: jest.fn(),
    reverseGeocodeAsync: jest.fn(),
    Accuracy: { Balanced: 3, Highest: 6 },
    PermissionStatus: { GRANTED: 'granted', DENIED: 'denied', UNDETERMINED: 'undetermined' },
  }),
  { virtual: true }
);

const mockGetPermissions = Location.getForegroundPermissionsAsync as jest.Mock;
const mockRequestPermissions = Location.requestForegroundPermissionsAsync as jest.Mock;

function getAppStateChangeHandler(): ((state: string) => void) | undefined {
  const calls = (AppState.addEventListener as jest.Mock).mock.calls;
  const changeCall = calls.find(([event]: [string]) => event === 'change');
  return changeCall ? changeCall[1] : undefined;
}

describe('LocationService — permission revoke detection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    locationService.reset();
    useLocationStore.getState().clearLocation();
    useDegradationStore.getState().setFeatureStatus(FeatureType.LOCATION, FeatureStatus.AVAILABLE);
  });

  it('does nothing on AppState active when permission was never granted', async () => {
    mockGetPermissions.mockResolvedValue({ status: 'denied' });

    const handler = getAppStateChangeHandler();
    expect(handler).toBeUndefined();
  });

  it('starts watcher after permission is granted', async () => {
    mockRequestPermissions.mockResolvedValue({ status: 'granted' });

    const granted = await locationService.requestPermission();
    expect(granted).toBe(true);

    const handler = getAppStateChangeHandler();
    expect(handler).toBeDefined();
    expect(useLocationStore.getState().permissionGranted).toBe(true);
  });

  it('does not register duplicate watchers on repeated grant', async () => {
    mockRequestPermissions.mockResolvedValue({ status: 'granted' });

    await locationService.requestPermission();
    await locationService.requestPermission();

    const changeCalls = (AppState.addEventListener as jest.Mock).mock.calls.filter(
      ([event]: [string]) => event === 'change'
    );
    expect(changeCalls.length).toBe(1);
  });

  it('clears cached coordinates and updates stores when permission revoked mid-session', async () => {
    mockRequestPermissions.mockResolvedValue({ status: 'granted' });
    mockGetPermissions.mockResolvedValue({ status: 'granted' });

    await locationService.requestPermission();

    // Simulate that a GPS fix was obtained previously
    (locationService as any).cachedLocation = {
      latitude: 37.7749,
      longitude: -122.4194,
      source: 'gps',
      obtainedAt: new Date().toISOString(),
    };
    useLocationStore.getState().setCoordinates({
      latitude: 37.7749,
      longitude: -122.4194,
    });

    expect(useLocationStore.getState().coordinates).toEqual({
      latitude: 37.7749,
      longitude: -122.4194,
    });
    expect(useLocationStore.getState().permissionGranted).toBe(true);
    expect(locationService.getCachedLocation()).not.toBeNull();
    expect(useDegradationStore.getState().featureStatuses[FeatureType.LOCATION]).toBe(
      FeatureStatus.AVAILABLE
    );

    // Revoke permission and trigger AppState active
    mockGetPermissions.mockResolvedValue({ status: 'denied' });

    const handler = getAppStateChangeHandler();
    expect(handler).toBeDefined();
    await handler!('active');

    // — Assertions —
    // 1. Cached location is cleared
    expect(locationService.getCachedLocation()).toBeNull();

    // 2. LocationStore coordinates cleared
    expect(useLocationStore.getState().coordinates).toBeNull();
    expect(useLocationStore.getState().permissionGranted).toBe(false);

    // 3. DegradationStore updated
    expect(useDegradationStore.getState().featureStatuses[FeatureType.LOCATION]).toBe(
      FeatureStatus.PERMISSION_DENIED
    );

    // 4. Watcher was stopped (calling cleanup again is safe)
    expect(() => locationService.cleanup()).not.toThrow();
  });

  it('stops watcher within one event loop cycle of detecting revoke', async () => {
    mockRequestPermissions.mockResolvedValue({ status: 'granted' });
    mockGetPermissions.mockResolvedValue({ status: 'granted' });

    await locationService.requestPermission();

    expect((locationService as any).appStateSubscription).not.toBeNull();
    expect((locationService as any).isWatchingPermissionChanges).toBe(true);

    mockGetPermissions.mockResolvedValue({ status: 'denied' });

    const handler = getAppStateChangeHandler();
    expect(handler).toBeDefined();
    await handler!('active');

    // The subscription should have been removed
    expect((locationService as any).appStateSubscription).toBeNull();
    expect((locationService as any).isWatchingPermissionChanges).toBe(false);
  });
});
