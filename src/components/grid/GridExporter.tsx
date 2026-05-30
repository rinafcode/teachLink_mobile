import { Download } from 'lucide-react-native';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { BatchProgress } from '../../services/batchDataProcessor';
import { ExportFormat } from '../../utils/gridUtils';
import { logger } from '../../utils/logger';

/**
 * Props for the GridExporter component.
 */
export interface GridExporterProps {
  /**
   * Called when the user selects an export format.
   * Must return the serialized string to share.
   */
  onExport: (
    format: ExportFormat,
    onProgress?: (progress: BatchProgress) => void
  ) => string | Promise<string>;
  /** When `true`, the export buttons are rendered but non-interactive. */
  disabled?: boolean;
}

/** File-name suffix used in the share sheet title. */
const LABEL: Record<ExportFormat, string> = {
  csv: 'CSV',
  json: 'JSON',
};

/**
 * Toolbar strip that provides one-tap data export in CSV and JSON formats.
 *
 * On press the component serializes the current grid data via `onExport`
 * and hands the result to the platform's native share sheet, so users can
 * save or forward the file without any additional permissions.
 */
export const GridExporter = ({
  onExport,
  disabled = false,
}: GridExporterProps): React.ReactElement => {
  const [activeFormat, setActiveFormat] = useState<ExportFormat | null>(null);
  const [progress, setProgress] = useState<BatchProgress | null>(null);

  const handleExport = useCallback(
    async (format: ExportFormat) => {
      if (disabled || activeFormat !== null) return;

      setActiveFormat(format);
      setProgress({ processed: 0, total: 0, percent: 0, phase: 'queued' });
      try {
        const data = await onExport(format, setProgress);

        await Share.share({
          message: data,
          title: `Export data as ${LABEL[format]}`,
        });
      } catch (err) {
        // Sharing cancelled by the user produces a rejection — treat it silently.
        const message = err instanceof Error ? err.message : String(err);
        if (!message.toLowerCase().includes('cancel')) {
          logger.error('[GridExporter] Share failed:', err);
        }
      } finally {
        setActiveFormat(null);
        setProgress(null);
      }
    },
    [disabled, activeFormat, onExport]
  );

  return (
    <View style={styles.container}>
      <Download size={14} color="#6B7280" />
      <Text style={styles.label}>Export:</Text>
      {(['csv', 'json'] as ExportFormat[]).map(format => {
        const isLoading = activeFormat === format;
        const isDisabled = disabled || activeFormat !== null;

        return (
          <TouchableOpacity
            key={format}
            style={[styles.btn, isDisabled && styles.btnDisabled]}
            onPress={() => handleExport(format)}
            disabled={isDisabled}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={`Export as ${LABEL[format]}`}
            accessibilityState={{ disabled: isDisabled, busy: isLoading }}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#19c3e6" />
            ) : (
              <Text style={[styles.btnText, isDisabled && styles.btnTextDisabled]}>
                {LABEL[format]}
              </Text>
            )}
          </TouchableOpacity>
        );
      })}
      {activeFormat && progress && (
        <View
          style={styles.progressWrap}
          accessibilityRole="progressbar"
          accessibilityValue={{
            min: 0,
            max: 100,
            now: progress.percent,
            text: `${progress.percent}%`,
          }}
        >
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progress.percent}%` }]} />
          </View>
          <Text style={styles.progressText}>
            {progress.phase === 'queued' ? 'Preparing' : `${progress.percent}%`}
          </Text>
        </View>
      )}
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#FAFAFA',
  },
  label: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  btn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#19c3e6',
    minWidth: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDisabled: {
    borderColor: '#D1D5DB',
  },
  btnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#19c3e6',
  },
  btnTextDisabled: {
    color: '#9CA3AF',
  },
  progressWrap: {
    minWidth: 90,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginLeft: 2,
  },
  progressTrack: {
    width: 56,
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
    backgroundColor: '#E5E7EB',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#19c3e6',
  },
  progressText: {
    minWidth: 28,
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '600',
  },
});
