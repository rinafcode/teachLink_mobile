import AsyncStorage from '@react-native-async-storage/async-storage';

import logger from '../utils/logger';

const VIDEO_POSITION_PREFIX = '@teachlink_video_pos_';

export interface VideoPositionData {
  positionMillis: number;
  durationMillis: number;
  updatedAt: number;
}

function storageKey(sourceId: string): string {
  return `${VIDEO_POSITION_PREFIX}${sourceId}`;
}

export async function saveVideoPosition(
  sourceId: string,
  positionMillis: number,
  durationMillis: number
): Promise<void> {
  if (!sourceId || positionMillis < 0) return;
  try {
    const data: VideoPositionData = {
      positionMillis,
      durationMillis,
      updatedAt: Date.now(),
    };
    await AsyncStorage.setItem(storageKey(sourceId), JSON.stringify(data));
  } catch (error) {
    logger.warn('positionStore: failed to save position', error);
  }
}

export async function getVideoPosition(
  sourceId: string
): Promise<VideoPositionData | null> {
  if (!sourceId) return null;
  try {
    const raw = await AsyncStorage.getItem(storageKey(sourceId));
    if (!raw) return null;
    return JSON.parse(raw) as VideoPositionData;
  } catch (error) {
    logger.warn('positionStore: failed to get position', error);
    return null;
  }
}

export async function clearVideoPosition(sourceId: string): Promise<void> {
  if (!sourceId) return;
  try {
    await AsyncStorage.removeItem(storageKey(sourceId));
  } catch (error) {
    logger.warn('positionStore: failed to clear position', error);
  }
}

export const positionStore = { saveVideoPosition, getVideoPosition, clearVideoPosition };
