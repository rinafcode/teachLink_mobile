/**
 * Tests for #618 — lastChecked updated on cache hit, lastNetworkCheck on API call
 */
import { useHealthDashboardStore } from '../../store/healthDashboardStore';

describe('healthDashboardStore — lastChecked / lastNetworkCheck (#618)', () => {
  beforeEach(() => {
    useHealthDashboardStore.getState().reset();
  });

  it('initialises both fields to null', () => {
    const { lastChecked, lastNetworkCheck } = useHealthDashboardStore.getState();
    expect(lastChecked).toBeNull();
    expect(lastNetworkCheck).toBeNull();
  });

  it('setLastChecked updates lastChecked but not lastNetworkCheck', () => {
    const before = Date.now();
    useHealthDashboardStore.getState().setLastChecked();
    const { lastChecked, lastNetworkCheck } = useHealthDashboardStore.getState();
    expect(lastChecked).toBeGreaterThanOrEqual(before);
    expect(lastNetworkCheck).toBeNull();
  });

  it('setLastNetworkCheck updates both lastNetworkCheck and lastChecked', () => {
    const before = Date.now();
    useHealthDashboardStore.getState().setLastNetworkCheck();
    const { lastChecked, lastNetworkCheck } = useHealthDashboardStore.getState();
    expect(lastNetworkCheck).toBeGreaterThanOrEqual(before);
    expect(lastChecked).toBeGreaterThanOrEqual(before);
  });

  it('lastChecked advances on repeated cache-hit calls while lastNetworkCheck stays null', () => {
    useHealthDashboardStore.getState().setLastChecked();
    const first = useHealthDashboardStore.getState().lastChecked!;

    // Simulate time passing
    jest.useFakeTimers();
    jest.advanceTimersByTime(1000);

    useHealthDashboardStore.getState().setLastChecked();
    const second = useHealthDashboardStore.getState().lastChecked!;

    expect(second).toBeGreaterThan(first);
    expect(useHealthDashboardStore.getState().lastNetworkCheck).toBeNull();

    jest.useRealTimers();
  });
});
