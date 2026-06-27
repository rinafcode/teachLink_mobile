import { getInfoAsync } from 'expo-file-system';
import { Linking, Platform } from 'react-native';

import { checkDeviceCompromised } from '../../utils/jailbreakDetection';

jest.mock('expo-file-system', () => ({
  getInfoAsync: jest.fn(),
}));

jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios' as const,
    select: (obj: any) => obj.ios,
  },
  Linking: {
    canOpenURL: jest.fn(),
  },
}));

const mockGetInfoAsync = getInfoAsync as jest.Mock;

function setPlatform(os: 'ios' | 'android' | 'web') {
  (Platform as any).OS = os;
  (Platform as any).select = (obj: any) => obj[os] ?? obj.default;
}

describe('checkDeviceCompromised', () => {
  beforeEach(() => {
    mockGetInfoAsync.mockReset();
    (Linking.canOpenURL as jest.Mock).mockReset();
    setPlatform('ios');
  });

  it('returns true when Cydia URL scheme is available on iOS', async () => {
    setPlatform('ios');
    (Linking.canOpenURL as jest.Mock).mockResolvedValue(true);

    const result = await checkDeviceCompromised();

    expect(result).toBe(true);
    expect(Linking.canOpenURL).toHaveBeenCalledWith('cydia://');
  });

  it('returns true when a jailbreak file path exists on iOS', async () => {
    setPlatform('ios');
    (Linking.canOpenURL as jest.Mock).mockResolvedValue(false);
    mockGetInfoAsync.mockImplementation((path: string) => {
      if (path === '/Applications/Cydia.app') {
        return { exists: true, isDirectory: false };
      }
      return { exists: false, isDirectory: false };
    });

    const result = await checkDeviceCompromised();

    expect(result).toBe(true);
  });

  it('returns false when no jailbreak indicators found on iOS', async () => {
    setPlatform('ios');
    (Linking.canOpenURL as jest.Mock).mockResolvedValue(false);
    mockGetInfoAsync.mockResolvedValue({ exists: false, isDirectory: false });

    const result = await checkDeviceCompromised();

    expect(result).toBe(false);
  });

  it('returns true when su binary exists on Android', async () => {
    setPlatform('android');
    mockGetInfoAsync.mockImplementation((path: string) => {
      if (path === '/system/bin/su') {
        return { exists: true, isDirectory: false };
      }
      return { exists: false, isDirectory: false };
    });

    const result = await checkDeviceCompromised();

    expect(result).toBe(true);
  });

  it('returns true when Superuser.apk exists on Android', async () => {
    setPlatform('android');
    mockGetInfoAsync.mockImplementation((path: string) => {
      if (path === '/system/app/Superuser.apk') {
        return { exists: true, isDirectory: false };
      }
      return { exists: false, isDirectory: false };
    });

    const result = await checkDeviceCompromised();

    expect(result).toBe(true);
  });

  it('returns false when no root indicators found on Android', async () => {
    setPlatform('android');
    mockGetInfoAsync.mockResolvedValue({ exists: false, isDirectory: false });

    const result = await checkDeviceCompromised();

    expect(result).toBe(false);
  });

  it('returns false for unsupported platforms', async () => {
    setPlatform('web');

    const result = await checkDeviceCompromised();

    expect(result).toBe(false);
  });

  it('handles file system errors gracefully', async () => {
    setPlatform('ios');
    (Linking.canOpenURL as jest.Mock).mockResolvedValue(false);
    mockGetInfoAsync.mockRejectedValue(new Error('Permission denied'));

    const result = await checkDeviceCompromised();

    expect(result).toBe(false);
  });

  it('handles Linking.canOpenURL errors gracefully', async () => {
    setPlatform('ios');
    (Linking.canOpenURL as jest.Mock).mockRejectedValue(new Error('not available'));
    mockGetInfoAsync.mockResolvedValue({ exists: false, isDirectory: false });

    const result = await checkDeviceCompromised();

    expect(result).toBe(false);
  });
});
