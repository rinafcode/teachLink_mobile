import { useRouter } from 'expo-router';
import React, { useRef } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

import { AppText as Text } from '@/components/common/AppText';
import { sampleCourse } from '@/data/sampleCourse';
import { useDynamicFontSize, useAnalytics } from '@/hooks';
import { useScrollRestoration } from '@/hooks/useScrollRestoration';
import { AnalyticsEvent } from '@/utils/trackingEvents';

export const HomeScreenContent = () => {
  const router = useRouter();
  const { scale } = useDynamicFontSize();
  const { trackEvent } = useAnalytics();
  const scrollRef = useRef<ScrollView>(null);
  const { onScroll } = useScrollRestoration(scrollRef, { screenId: 'home' });

  return (
    <ScrollView
      ref={scrollRef}
      onScroll={onScroll}
      scrollEventThrottle={16}
      className="flex-1 bg-gray-50 dark:bg-slate-800"
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.headerSection}>
        <Text style={[styles.headerIcon, { fontSize: scale(60) }]}>? </Text>
        <Text style={styles.title}>Welcome to TeachLink</Text>
        <Text style={styles.subtitle}>Share and consume knowledge on the go</Text>
      </View>

      <TouchableOpacity
        style={styles.primaryButton}
        onPress={() => {
          trackEvent(AnalyticsEvent.BUTTON_CLICK, { button: 'start_learning', screen: 'home' });
          router.push({
            pathname: '../course-viewer',
            params: { course: JSON.stringify(sampleCourse) },
          });
        }}
        accessibilityRole="button"
        accessibilityLabel="Start Learning"
        accessibilityHint="Opens the course viewer with a sample lesson"
      >
        <View style={styles.buttonContent}>
          <Text style={[styles.buttonIcon, { fontSize: scale(28) }]}>? </Text>
          <View style={styles.buttonTextContainer}>
            <Text style={styles.buttonTitle}>Start Learning</Text>
            <Text style={styles.buttonSubtitle}>Open course viewer</Text>
          </View>
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={() => {
          trackEvent(AnalyticsEvent.BUTTON_CLICK, { button: 'search', screen: 'home' });
          router.push('../search');
        }}
        accessibilityRole="button"
        accessibilityLabel="Search courses"
        accessibilityHint="Navigates to the search screen"
      >
        <View style={styles.secondaryButtonContent}>
          <Text style={[styles.secondaryIcon, { fontSize: scale(32) }]}>? </Text>
          <View style={styles.secondaryTextContainer}>
            <Text style={styles.secondaryTitle}>Search</Text>
            <Text style={styles.secondarySubtitle}>Find courses and lessons</Text>
          </View>
          <Text style={[styles.arrow, { fontSize: scale(24) }]}>{'>'}</Text>
        </View>
      </TouchableOpacity>

      <View style={styles.secondaryButtonsContainer}>
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => {
            trackEvent(AnalyticsEvent.BUTTON_CLICK, { button: 'profile', screen: 'home' });
            router.push('../profile/123');
          }}
          accessibilityRole="button"
          accessibilityLabel="My Profile"
          accessibilityHint="View your learning progress and achievements"
        >
          <View style={styles.secondaryButtonContent}>
            <Text style={styles.secondaryIcon}>? </Text>
            <View style={styles.secondaryTextContainer}>
              <Text style={styles.secondaryTitle}>My Profile</Text>
              <Text style={styles.secondarySubtitle}>View your progress</Text>
            </View>
            <Text style={styles.arrow}>{'>'}</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => {
            trackEvent(AnalyticsEvent.BUTTON_CLICK, { button: 'settings', screen: 'home' });
            router.push('../settings');
          }}
          accessibilityRole="button"
          accessibilityLabel="Settings"
          accessibilityHint="Customize your app experience"
        >
          <View style={styles.secondaryButtonContent}>
            <Text style={styles.secondaryIcon}>? </Text>
            <View style={styles.secondaryTextContainer}>
              <Text style={styles.secondaryTitle}>Settings</Text>
              <Text style={styles.secondarySubtitle}>Customize your experience</Text>
            </View>
            <Text style={styles.arrow}>{'>'}</Text>
          </View>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 30,
  },
  headerSection: {
    paddingHorizontal: 24,
    paddingVertical: 32,
    alignItems: 'center',
  },
  headerIcon: {
    fontSize: 60,
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    fontWeight: '500',
  },
  primaryButton: {
    marginHorizontal: 16,
    marginBottom: 20,
    backgroundColor: '#19c3e6',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  buttonIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  buttonTextContainer: {
    flex: 1,
  },
  buttonTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 2,
  },
  buttonSubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
  },
  secondaryButtonsContainer: {
    marginHorizontal: 16,
    marginBottom: 24,
    gap: 12,
  },
  secondaryButton: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  secondaryButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  secondaryIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  secondaryTextContainer: {
    flex: 1,
  },
  secondaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  secondarySubtitle: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '500',
  },
  arrow: {
    fontSize: 24,
    color: '#d1d5db',
    marginLeft: 8,
  },
});
