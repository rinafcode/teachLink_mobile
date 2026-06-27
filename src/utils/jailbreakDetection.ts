import * as FileSystem from 'expo-file-system';
import { Linking, Platform } from 'react-native';

const JAILBREAK_PATHS_IOS = [
  '/Applications/Cydia.app',
  '/Applications/FakeCarrier.app',
  '/Applications/Icy.app',
  '/Applications/IntelliScreen.app',
  '/Applications/MxTube.app',
  '/Applications/RockApp.app',
  '/Applications/SBSettings.app',
  '/Applications/WinterBoard.app',
  '/Applications/blackra1n.app',
  '/Library/MobileSubstrate/MobileSubstrate.dylib',
  '/Library/MobileSubstrate/DynamicLibraries/LiveClock.plist',
  '/Library/MobileSubstrate/DynamicLibraries/Veency.plist',
  '/private/var/lib/apt',
  '/private/var/lib/cydia',
  '/private/var/mobile/Library/SBSettings/Themes',
  '/private/var/stash',
  '/private/var/tmp/cydia.log',
  '/usr/bin/sshd',
  '/usr/libexec/sftp-server',
  '/usr/libexec/ssh-keysign',
  '/bin/bash',
  '/etc/apt',
  '/etc/ssh/sshd_config',
  '/var/log/syslog',
  '/var/tmp/cydia.log',
];

const ROOT_PATHS_ANDROID = [
  '/system/bin/su',
  '/system/xbin/su',
  '/system/sbin/su',
  '/sbin/su',
  '/su/bin/su',
  '/data/local/su',
  '/data/local/xbin/su',
  '/data/local/bin/su',
  '/system/sd/xbin/su',
  '/system/bin/failsafe/su',
  '/data/local/xbin/su',
];

const ROOT_APKS_ANDROID = [
  '/system/app/Superuser.apk',
  '/system/app/SuperSU.apk',
  '/system/app/com.noshufou.android.su.apk',
  '/system/app/mobi.mgeek.TunnyBrowser.apk',
];

async function checkIOSJailbroken(): Promise<boolean> {
  try {
    const canOpen = await Linking.canOpenURL('cydia://');
    if (canOpen) return true;
  } catch {}

  for (const path of JAILBREAK_PATHS_IOS) {
    try {
      const info = await FileSystem.getInfoAsync(path);
      if (info.exists) return true;
    } catch {}
  }

  return false;
}

async function checkAndroidRooted(): Promise<boolean> {
  for (const path of ROOT_PATHS_ANDROID) {
    try {
      const info = await FileSystem.getInfoAsync(path);
      if (info.exists) return true;
    } catch {}
  }

  for (const path of ROOT_APKS_ANDROID) {
    try {
      const info = await FileSystem.getInfoAsync(path);
      if (info.exists) return true;
    } catch {}
  }

  return false;
}

export async function checkDeviceCompromised(): Promise<boolean> {
  if (Platform.OS === 'ios') {
    return checkIOSJailbroken();
  }
  if (Platform.OS === 'android') {
    return checkAndroidRooted();
  }
  return false;
}
