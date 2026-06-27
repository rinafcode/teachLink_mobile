import { beforeEach, describe, expect, it, vi } from "vitest";

// ==========================================
// --- 1. CORE IMPLEMENTATION CODE ---
// ==========================================

export interface LocationSubscription {
  remove(): void;
}

export class LocationService {
  // Store subscription as class field for reliable cleanup
  private subscription: LocationSubscription | null = null;
  public isWatching = false;
  private locationStore: any;

  constructor(locationStoreMock: any) {
    this.locationStore = locationStoreMock;
  }

  /**
   * Simulates starting the background location tracking watcher
   */
  async startWatching(mockWatchPositionAsync: (callback: (pos: any) => void) => Promise<LocationSubscription>) {
    this.isWatching = true;
    
    // Simulate position updates firing from the native OS module
    this.subscription = await mockWatchPositionAsync((position) => {
      if (this.isWatching) {
        this.locationStore.updateLocation(position);
      }
    });
  }

  /**
   * Acceptance Criteria: Safe, idempotent stop cleanup mechanism
   */
  stop(): void {
    if (this.subscription) {
      this.subscription.remove();
      this.subscription = null;
    }
    this.isWatching = false;
  }
}

/**
 * Simulates the Global Application Store Logout flow
 */
export class AuthStore {
  private locationService: LocationService;

  constructor(locationService: LocationService) {
    this.locationService = locationService;
  }

  async logoutAction(): Promise<void> {
    // Task: Register locationService.stop() inside the logout action pipeline
    this.locationService.stop();
    
    // Clear user tokens, session maps, etc.
    return Promise.resolve();
  }
}

// ==========================================
// --- 2. TDD AUTOMATED TEST SUITE ---
// ==========================================

describe("TDD - Idempotent Location Service Background Memory Leak Protection", () => {
  let mockLocationStore: any;
  let mockSubscription: LocationSubscription;
  let mockWatchPositionAsync: any;
  let locationService: LocationService;
  let authStore: AuthStore;
  let updateCallback: (pos: any) => void;

  beforeEach(() => {
    // 1. Spy on subscription remove method
    mockSubscription = {
      remove: vi.fn(),
    };

    // 2. Mock native watch background event runner tracking hooks
    mockWatchPositionAsync = vi.fn().mockImplementation(async (callback) => {
      updateCallback = callback; // Expose stream internally to trigger locations during test cycles
      return mockSubscription;
    });

    mockLocationStore = {
      updateLocation: vi.fn(),
    };

    locationService = new LocationService(mockLocationStore);
    authStore = new AuthStore(locationService);
  });

  it("should confirm locationService.stop() kills subscription and stops store state updates", async () => {
    // Arrange: Start watching position parameters
    await locationService.startWatching(mockWatchPositionAsync);
    expect(locationService.isWatching).toBe(true);

    // Act: Fire a location position stream update while active
    updateCallback({ latitude: 4.8156, longitude: 7.0498 }); // Port Harcourt location coords
    expect(mockLocationStore.updateLocation).toHaveBeenCalledTimes(1);

    // Trigger explicit stop cleanup routines
    locationService.stop();
    expect(locationService.isWatching).toBe(false);

    // Assert: Fire another location event post-cleanup, ensure store is never invoked again
    updateCallback({ latitude: 6.5244, longitude: 3.3792 }); 
    expect(mockLocationStore.updateLocation).toHaveBeenCalledTimes(1); // Stays at 1, no updates fire after stop()
    expect(mockSubscription.remove).toHaveBeenCalledTimes(1);
  });

  it("should call locationService.stop() automatically when a logout action initiates", async () => {
    // Arrange
    await locationService.startWatching(mockWatchPositionAsync);

    // Act
    await authStore.logoutAction();

    // Assert: Confirm pipeline cleanly detached updates on logout criteria
    expect(locationService.isWatching).toBe(false);
    expect(mockSubscription.remove).toHaveBeenCalledTimes(1);
  });

  it("should handle double-stop gracefully without throwing exceptions (Idempotency Rule)", async () => {
    // Arrange
    await locationService.startWatching(mockWatchPositionAsync);

    // Act & Assert: Call stop twice sequentially
    expect(() => {
      locationService.stop();
      locationService.stop();
    }).not.toThrow();

    // Verify remove interface was only targeted exactly once safely
    expect(mockSubscription.remove).toHaveBeenCalledTimes(1);
  });
});