import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

import { logger } from '../utils/logger';

export interface ClipboardOperationMetrics {
  duration: number; // milliseconds
  textSize: number; // bytes/characters
  timestamp: number;
}

class ClipboardService {
  private lastMetrics: ClipboardOperationMetrics | null = null;

  /**
   * Copy text to the clipboard asynchronously.
   * Leverages expo-clipboard native async bindings.
   *
   * @param text The text to copy
   * @param triggerHaptic Whether to fire haptic feedback on success
   */
  async copyToClipboardAsync(text: string, triggerHaptic = true): Promise<boolean> {
    const startTime = performance.now();
    try {
      if (!text) {
        throw new Error('Cannot copy empty or null text to clipboard.');
      }

      // Perform copy asynchronously via native module
      await Clipboard.setStringAsync(text);

      const endTime = performance.now();
      const duration = endTime - startTime;

      this.lastMetrics = {
        duration,
        textSize: text.length,
        timestamp: Date.now(),
      };

      logger.info(`[ClipboardService] Copied ${text.length} characters in ${duration.toFixed(2)}ms`);

      if (triggerHaptic && Platform.OS !== 'web') {
        try {
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        } catch (hapticError) {
          // Ignore haptic errors if device doesn't support it or not loaded
        }
      }

      return true;
    } catch (error) {
      logger.error('[ClipboardService] Failed to copy to clipboard:', error as Error);
      throw error;
    }
  }

  /**
   * Paste text from the clipboard asynchronously.
   * Leverages expo-clipboard native async bindings.
   */
  async pasteFromClipboardAsync(): Promise<string> {
    const startTime = performance.now();
    try {
      // Retrieve clipboard content asynchronously via native module
      const text = await Clipboard.getStringAsync();
      const endTime = performance.now();
      const duration = endTime - startTime;

      this.lastMetrics = {
        duration,
        textSize: text ? text.length : 0,
        timestamp: Date.now(),
      };

      logger.info(`[ClipboardService] Pasted ${text ? text.length : 0} characters in ${duration.toFixed(2)}ms`);

      return text || '';
    } catch (error) {
      logger.error('[ClipboardService] Failed to paste from clipboard:', error as Error);
      throw error;
    }
  }

  /**
   * Get the metrics of the last clipboard operation.
   */
  getLastMetrics(): ClipboardOperationMetrics | null {
    return this.lastMetrics;
  }
}

export const clipboardService = new ClipboardService();
