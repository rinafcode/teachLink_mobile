import * as Battery from 'expo-battery';
import { useDeviceStore } from '../store/deviceStore';
import logger from '../utils/logger';

class BatteryService {
  private subscription: Battery.Subscription | null = null;
  private powerModeSubscription: Battery.Subscription | null = null;

  async initialize() {
    try {
      const [level, state, lowPowerMode] = await Promise.all([
        Battery.getBatteryLevelAsync(),
        Battery.getBatteryStateAsync(),
        Battery.isLowPowerModeEnabledAsync(),
      ]);

      useDeviceStore.getState().updateBatteryInfo(level, state, lowPowerMode);

      // Listen for battery level changes
      this.subscription = Battery.addBatteryLevelListener(({ batteryLevel }: Battery.BatteryLevelEvent) => {
        const currentState = useDeviceStore.getState().batteryState;
        const currentLowPower = useDeviceStore.getState().lowPowerMode;
        useDeviceStore.getState().updateBatteryInfo(batteryLevel, currentState, currentLowPower);
      });

      // Listen for battery state changes (charging, full, etc.)
      Battery.addBatteryStateListener(({ batteryState }: Battery.BatteryStateEvent) => {
        const currentLevel = useDeviceStore.getState().batteryLevel;
        const currentLowPower = useDeviceStore.getState().lowPowerMode;
        useDeviceStore.getState().updateBatteryInfo(currentLevel, batteryState, currentLowPower);
      });

      // Listen for low power mode changes
      this.powerModeSubscription = Battery.addLowPowerModeListener(({ lowPowerMode }: Battery.PowerModeEvent) => {
        const currentLevel = useDeviceStore.getState().batteryLevel;
        const currentState = useDeviceStore.getState().batteryState;
        useDeviceStore.getState().updateBatteryInfo(currentLevel, currentState, lowPowerMode);
      });

      logger.info('BatteryService initialized');
    } catch (error) {
      logger.error('Failed to initialize BatteryService', error);
    }
  }

  shutdown() {
    this.subscription?.remove();
    this.powerModeSubscription?.remove();
    this.subscription = null;
    this.powerModeSubscription = null;
  }
}

export const batteryService = new BatteryService();
export default batteryService;
