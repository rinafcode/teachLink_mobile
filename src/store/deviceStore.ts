import { create } from 'zustand';
import * as Battery from 'expo-battery';

interface DeviceState {
  batteryLevel: number;
  batteryState: Battery.BatteryState;
  isLowBattery: boolean;
  lowPowerMode: boolean;
  /** True when the app is backgrounded (not visible to the user) */
  isInBackground: boolean;
  
  // Actions
  updateBatteryInfo: (level: number, state: Battery.BatteryState, lowPowerMode: boolean) => void;
  setIsInBackground: (isBg: boolean) => void;
}

export const useDeviceStore = create<DeviceState>((set) => ({
  batteryLevel: 1,
  batteryState: Battery.BatteryState.UNKNOWN,
  isLowBattery: false,
  lowPowerMode: false,
  isInBackground: false,

  updateBatteryInfo: (level, state, lowPowerMode) => {
    // Battery level < 20% triggers throttling
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
}));
