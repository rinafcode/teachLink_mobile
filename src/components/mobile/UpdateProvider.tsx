import React, { ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { useAppUpdate } from '../../hooks/useAppUpdate';
import { ErrorBoundary } from '../common/ErrorBoundary';
import { UpdatePrompt } from './UpdatePrompt';

interface UpdateProviderProps {
  children: ReactNode;
}

/**
 * UpdateProvider mounts at the root of the app and:
 * 1. Checks for OTA updates on launch (via useAppUpdate)
 * 2. Renders the UpdatePrompt modal when an update is available
 *
 * Wrap this inside AnalyticsProvider so analytics are ready before
 * the first update check fires.
 */
export const UpdateProvider: React.FC<UpdateProviderProps> = ({ children }) => {
  const colorScheme = useColorScheme();
  const { isPromptVisible, status, applyUpdate, dismissUpdate } = useAppUpdate();

  return (
    <ErrorBoundary boundaryName="UpdateProvider">
      {children}
      <UpdatePrompt
        visible={isPromptVisible}
        isDownloading={status === 'downloading'}
        onUpdate={applyUpdate}
        onDismiss={dismissUpdate}
        isDark={colorScheme === 'dark'}
      />
    </ErrorBoundary>
  );
};

export default UpdateProvider;
