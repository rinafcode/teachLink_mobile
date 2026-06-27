const GB = 1024 * 1024 * 1024;

function mockDevice() {
  return jest.requireMock('expo-device') as {
    deviceYear?: number | null;
    totalMemory?: number | null;
    [key: string]: unknown;
  };
}

function loadLayoutAnimationModule() {
  const reactNative = require('react-native');
  reactNative.LayoutAnimation = reactNative.LayoutAnimation || {};
  reactNative.LayoutAnimation.create = reactNative.LayoutAnimation.create || jest.fn((config: unknown) => config);
  reactNative.LayoutAnimation.configureNext = reactNative.LayoutAnimation.configureNext || jest.fn();
  return require('../../utils/layoutAnimation') as typeof import('../../utils/layoutAnimation');
}

describe('layoutAnimation utility', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.useFakeTimers();

    const device = mockDevice();
    device.deviceYear = 2022;
    device.totalMemory = 6 * GB;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('debounces configureNext on mid/high-end devices', () => {
    const layoutAnimation = loadLayoutAnimationModule();
    const reactNative = require('react-native');
    reactNative.LayoutAnimation.configureNext = jest.fn();

    layoutAnimation.configureNext();
    expect(reactNative.LayoutAnimation.configureNext).not.toHaveBeenCalled();

    jest.advanceTimersByTime(100);
    expect(reactNative.LayoutAnimation.configureNext).toHaveBeenCalledTimes(1);
  });

  it('skips LayoutAnimation on low-end devices', () => {
    mockDevice().deviceYear = 2018;
    mockDevice().totalMemory = 1.5 * GB;

    const layoutAnimation = loadLayoutAnimationModule();
    const reactNative = require('react-native');
    reactNative.LayoutAnimation.configureNext = jest.fn();

    layoutAnimation.configureNext();
    jest.advanceTimersByTime(100);

    expect(reactNative.LayoutAnimation.configureNext).not.toHaveBeenCalled();
    expect(layoutAnimation.shouldEnableLayoutAnimation()).toBe(false);
  });

  it('uses the spring preset for high-end devices', () => {
    mockDevice().totalMemory = 8 * GB;
    const layoutAnimation = loadLayoutAnimationModule();

    const preset = layoutAnimation.getOptimizedPreset();
    expect(preset).toHaveProperty('duration', 250);
  });

  it('uses the minimal preset for low-end devices', () => {
    mockDevice().deviceYear = 2018;
    mockDevice().totalMemory = 1.5 * GB;

    const layoutAnimation = loadLayoutAnimationModule();
    const preset = layoutAnimation.getOptimizedPreset();

    expect(preset).toHaveProperty('duration', 100);
  });

  it('configureNextImmediate applies animation immediately', () => {
    const layoutAnimation = loadLayoutAnimationModule();
    const reactNative = require('react-native');
    reactNative.LayoutAnimation.configureNext = jest.fn();

    layoutAnimation.configureNextImmediate();
    expect(reactNative.LayoutAnimation.configureNext).toHaveBeenCalledTimes(1);
  });
});
