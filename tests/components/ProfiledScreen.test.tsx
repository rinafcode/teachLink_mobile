import React from 'react';
import { Text } from 'react-native';
import { render } from '@testing-library/react-native';
import { ProfiledScreen } from '../../src/components/mobile/ProfiledScreen';
import { mobileAnalyticsService } from '../../src/services/mobileAnalytics';

jest.mock('../../src/services/mobileAnalytics', () => ({
  mobileAnalyticsService: {
    trackEvent: jest.fn(),
    trackPerformance: jest.fn(),
  },
}));

jest.mock('../../src/utils/logger', () => ({
  appLogger: {
    infoSync: jest.fn(),
    warnSync: jest.fn(),
  },
}));

const mockTrackPerformance = mobileAnalyticsService.trackPerformance as jest.MockedFunction<
  typeof mobileAnalyticsService.trackPerformance
>;

describe('ProfiledScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders children without crashing', () => {
    const { getByText } = render(
      <ProfiledScreen name="TestScreen">
        <Text>Hello World</Text>
      </ProfiledScreen>
    );

    expect(getByText('Hello World')).toBeTruthy();
  });

  it('forwards render metrics to analytics on mount', () => {
    render(
      <ProfiledScreen name="HomeScreen">
        <Text>Content</Text>
      </ProfiledScreen>
    );

    expect(mockTrackPerformance).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(Number),
      expect.objectContaining({ component: 'HomeScreen' })
    );
  });

  it('passes the screen name as Profiler id', () => {
    render(
      <ProfiledScreen name="CourseScreen">
        <Text>Course</Text>
      </ProfiledScreen>
    );

    expect(mockTrackPerformance).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(Number),
      expect.objectContaining({ component: 'CourseScreen' })
    );
  });

  it('accepts profiler options without crashing', () => {
    expect(() =>
      render(
        <ProfiledScreen name="OptionsScreen" options={{ slowRenderThresholdMs: 50 }}>
          <Text>Options</Text>
        </ProfiledScreen>
      )
    ).not.toThrow();
  });
});
