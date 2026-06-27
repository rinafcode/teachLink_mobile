import { useDeviceStore } from '../../store/deviceStore';

jest.mock('../../utils/jailbreakDetection', () => ({
  checkDeviceCompromised: jest.fn(),
}));

const mockCheckDeviceCompromised = jest.requireMock('../../utils/jailbreakDetection')
  .checkDeviceCompromised as jest.Mock;

const getStore = () => useDeviceStore.getState();

beforeEach(() => {
  useDeviceStore.setState({
    batteryLevel: 1,
    batteryState: 0,
    isLowBattery: false,
    lowPowerMode: false,
    isInBackground: false,
    isDeviceCompromised: false,
  });
  mockCheckDeviceCompromised.mockReset();
});

describe('deviceStore', () => {
  describe('isDeviceCompromised', () => {
    it('defaults to false', () => {
      expect(getStore().isDeviceCompromised).toBe(false);
    });

    it('can be set to true via setDeviceCompromised', () => {
      getStore().setDeviceCompromised(true);
      expect(getStore().isDeviceCompromised).toBe(true);
    });

    it('can be reset to false via setDeviceCompromised', () => {
      getStore().setDeviceCompromised(true);
      getStore().setDeviceCompromised(false);
      expect(getStore().isDeviceCompromised).toBe(false);
    });
  });

  describe('runDeviceCompromisedCheck', () => {
    it('returns false and sets state to false when device is not compromised', async () => {
      mockCheckDeviceCompromised.mockResolvedValue(false);

      const result = await getStore().runDeviceCompromisedCheck();

      expect(result).toBe(false);
      expect(getStore().isDeviceCompromised).toBe(false);
    });

    it('returns true and sets state to true when device is compromised', async () => {
      mockCheckDeviceCompromised.mockResolvedValue(true);

      const result = await getStore().runDeviceCompromisedCheck();

      expect(result).toBe(true);
      expect(getStore().isDeviceCompromised).toBe(true);
    });

    it('calls checkDeviceCompromised from the utility module', async () => {
      mockCheckDeviceCompromised.mockResolvedValue(false);

      await getStore().runDeviceCompromisedCheck();

      expect(mockCheckDeviceCompromised).toHaveBeenCalledTimes(1);
    });
  });
});
