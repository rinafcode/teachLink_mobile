import * as Battery from 'expo-battery';
import { create } from 'zustand';

import { checkDeviceCompromised } from '../utils/jailbreakDetection';

export type MemoryPressureLevel = 'normal' | 'warning' | 'critical';

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
  biometricEnabled: boolean;
  /** Current memory pressure level: normal (<70%), warning (70-85%), critical (>85%) */
  memoryPressureLevel: MemoryPressureLevel;

  // Actions
  updateBatteryInfo: (level: number, state: Battery.BatteryState, lowPowerMode: boolean) => void;
  setIsInBackground: (isBg: boolean) => void;
  setDeviceCompromised: (compromised: boolean) => void;
  setLastBiometricAuth: (timestamp: number | null) => void;
  setBiometricEnabled: (enabled: boolean) => void;
  setMemoryPressureLevel: (level: MemoryPressureLevel) => void;
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
  biometricEnabled: false,
  memoryPressureLevel: 'normal',

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
  setLastBiometricAuth: timestamp => {
    set({ lastBiometricAuth: timestamp });
  },
  setBiometricEnabled: enabled => {
    set({ biometricEnabled: enabled });
  },
  setMemoryPressureLevel: level => {
    set({ memoryPressureLevel: level });
  },
  runDeviceCompromisedCheck: async () => {
    const compromised = await checkDeviceCompromised();
    set({ isDeviceCompromised: compromised });
    return compromised;
  },
}));
