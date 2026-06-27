import React, { useEffect, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

import { useStartupProgressStore } from '../../services/startupProgressService';

/**
 * StartupProgressOverlay displays the app initialization progress
 * with visual feedback, step names, and estimated time remaining
 */
export const StartupProgressOverlay = () => {
  const { isInitializing, steps } = useStartupProgressStore();
  const getProgress = useStartupProgressStore.getState().getProgress;
  const getRemainingTime = useStartupProgressStore.getState().getRemainingTime;
  const getInProgressStep = useStartupProgressStore.getState().getInProgressStep;
  const getCompletedSteps = useStartupProgressStore.getState().getCompletedSteps;

  const [progress, setProgress] = useState(0);
  const [remainingTime, setRemainingTime] = useState(0);
  const [currentStep, setCurrentStep] = useState<string | undefined>();
  const [completedCount, setCompletedCount] = useState(0);
  const [progressAnim] = useState(new Animated.Value(0));

  // Subscribe to store changes
  useEffect(() => {
    const unsubscribe = useStartupProgressStore.subscribe(() => {
      const progressValue = getProgress();
      setProgress(progressValue);
      setRemainingTime(getRemainingTime());

      const inProgressStep = getInProgressStep();
      setCurrentStep(inProgressStep?.name);

      const completed = getCompletedSteps();
      setCompletedCount(completed.length);

      // Animate progress bar
      Animated.timing(progressAnim, {
        toValue: progressValue,
        duration: 300,
        useNativeDriver: false,
      }).start();
    });

    return unsubscribe;
  }, []);

  // Format time as MM:SS
  const formatTime = (ms: number) => {
    const seconds = Math.ceil(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isInitializing) {
    return null;
  }

  const totalSteps = steps.size;
  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* Logo/Title */}
        <View style={styles.header}>
          <Text style={styles.title}>TeachLink</Text>
          <Text style={styles.subtitle}>Initializing...</Text>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <Animated.View
            style={[
              styles.progressBar,
              {
                width: progressWidth,
              },
            ]}
          />
        </View>

        {/* Progress Text */}
        <View style={styles.statsContainer}>
          <Text style={styles.progressText}>
            {Math.round(progress)}%
          </Text>
          <Text style={styles.stepsText}>
            {completedCount} of {totalSteps} steps
          </Text>
        </View>

        {/* Current Step */}
        {currentStep && (
          <View style={styles.stepContainer}>
            <Text style={styles.stepLabel}>Current Step</Text>
            <Text style={styles.stepName}>{currentStep}</Text>
          </View>
        )}

        {/* Time Remaining */}
        {remainingTime > 0 && (
          <View style={styles.timeContainer}>
            <Text style={styles.timeLabel}>Estimated time remaining</Text>
            <Text style={styles.timeValue}>{formatTime(remainingTime)}</Text>
          </View>
        )}

        {/* Step List */}
        <View style={styles.stepListContainer}>
          {Array.from(steps.values()).map((step) => (
            <View key={step.id} style={styles.stepItem}>
              <View
                style={[
                  styles.stepIndicator,
                  {
                    backgroundColor:
                      step.status === 'completed'
                        ? '#10B981'
                        : step.status === 'in-progress'
                          ? '#3B82F6'
                          : step.status === 'failed'
                            ? '#EF4444'
                            : '#E5E7EB',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.stepIndicatorText,
                    {
                      color:
                        step.status === 'pending' ? '#9CA3AF' : '#FFFFFF',
                    },
                  ]}
                >
                  {step.status === 'completed'
                    ? '✓'
                    : step.status === 'in-progress'
                      ? '⟳'
                      : step.status === 'failed'
                        ? '✕'
                        : '○'}
                </Text>
              </View>
              <View style={styles.stepTextContainer}>
                <Text
                  style={[
                    styles.stepItemName,
                    {
                      opacity:
                        step.status === 'pending' ? 0.5 : 1,
                    },
                  ]}
                >
                  {step.name}
                </Text>
                {step.error && (
                  <Text style={styles.stepError}>{step.error}</Text>
                )}
              </View>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#FFFFFF',
    zIndex: 9999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    width: '100%',
    paddingHorizontal: 24,
    paddingVertical: 40,
    alignItems: 'center',
  },
  header: {
    marginBottom: 40,
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },
  progressContainer: {
    width: '100%',
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 24,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#3B82F6',
    borderRadius: 4,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  progressText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
  },
  stepsText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  stepContainer: {
    width: '100%',
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  stepLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '600',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  stepName: {
    fontSize: 14,
    color: '#1F2937',
    fontWeight: '600',
  },
  timeContainer: {
    width: '100%',
    marginBottom: 32,
    paddingHorizontal: 8,
  },
  timeLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '600',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  timeValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#3B82F6',
  },
  stepListContainer: {
    width: '100%',
    maxHeight: 200,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 8,
  },
  stepIndicator: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  stepIndicatorText: {
    fontSize: 12,
    fontWeight: '700',
  },
  stepTextContainer: {
    flex: 1,
  },
  stepItemName: {
    fontSize: 13,
    color: '#1F2937',
    fontWeight: '500',
  },
  stepError: {
    fontSize: 11,
    color: '#EF4444',
    fontWeight: '400',
    marginTop: 2,
  },
});
