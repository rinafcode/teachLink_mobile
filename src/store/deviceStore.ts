import * as Battery from 'expo-battery';
import { create } from 'zustand';

import { checkDeviceCompromised } from '../utils/jailbreakDetection';

interface DeviceState {
  batteryLevel: number;
  batteryState: Battery.BatteryState;
  isLowBattery: boolean;
  lowPowerMode: boolean;
  /** True when the app is backgrounded (not visible to the user) */
  isInBackground: boolean;
  /** True when the device is jailbroken (iOS) or rooted (Android) */
  isDeviceCompromised: boolean;
  lastBiometricAuth: number | null;

  // Actions
  updateBatteryInfo: (level: number, state: Battery.BatteryState, lowPowerMode: boolean) => void;
  setIsInBackground: (isBg: boolean) => void;
  setDeviceCompromised: (compromised: boolean) => void;
  setLastBiometricAuth: (timestamp: number | null) => void;
  /** Runs jailbreak/root detection and updates state */
  runDeviceCompromisedCheck: () => Promise<boolean>;
}

export const useDeviceStore = create<DeviceState>(set => ({
  batteryLevel: 1,
  batteryState: Battery.BatteryState.UNKNOWN,
  isLowBattery: false,
  lowPowerMode: false,
  isInBackground: false,
  isDeviceCompromised: false,
  lastBiometricAuth: null,

  updateBatteryInfo: (level, state, lowPowerMode) => {
    const isLowBattery = level > 0 && level < 0.2;
    set({
      batteryLevel: level,
      batteryState: state,
      isLowBattery,
      lowPowerMode,
    });
  },
  setIsInBackground: (isBg: boolean) => {
    set({ isInBackground: isBg });
  },
  setDeviceCompromised: (compromised: boolean) => {
    set({ isDeviceCompromised: compromised });
  },
  setLastBiometricAuth: (timestamp) => {
    set({ lastBiometricAuth: timestamp });
  },
  runDeviceCompromisedCheck: async () => {
    const compromised = await checkDeviceCompromised();
    set({ isDeviceCompromised: compromised });
    return compromised;
  },
}));
