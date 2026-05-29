import * as Linking from 'expo-linking';
import * as Notifications from 'expo-notifications';
import { sampleCourse } from '../data/sampleCourse';
import { offlineStorage } from '../services/offlineStorage';
import { Course } from '../types/course';
import { NotificationData, NotificationType } from '../types/notifications';
import { getPathFromDeepLink, ParsedDeepLink, parseDeepLinkUrl } from './linkParser';

export async function getInitialDeepLinkUrl(): Promise<string | null> {
  try {
    const response = await Notifications.getLastNotificationResponseAsync();
    if (response) {
      const data = response.notification.request.content.data as NotificationData | undefined;
      if (data?.deepLink) {
        return data.deepLink;
      }

      return buildDeepLinkUrlFromNotification(data);
    }
  } catch (error) {
    console.warn('Unable to read initial notification deep link:', error);
  }

  try {
    return await Linking.getInitialURL();
  } catch (error) {
    console.warn('Unable to read initial deep link URL:', error);
    return null;
  }
}

export function parseDeepLink(rawUrl: string): ParsedDeepLink | null {
  return parseDeepLinkUrl(rawUrl);
}

function buildDeepLinkUrlFromNotification(data?: NotificationData): string | null {
  if (!data || !data.type) return null;

  const baseUrl = 'teachlink://';

  switch (data.type) {
    case NotificationType.COURSE_UPDATE:
      return data.courseId ? `${baseUrl}course/${data.courseId}` : `${baseUrl}courses`;
    case NotificationType.MESSAGE:
      return data.conversationId
        ? `${baseUrl}messages/${data.conversationId}`
        : `${baseUrl}messages`;
    case NotificationType.LEARNING_REMINDER:
      return `${baseUrl}learn`;
    case NotificationType.ACHIEVEMENT_UNLOCK:
      return data.achievementId
        ? `${baseUrl}achievements/${data.achievementId}`
        : `${baseUrl}achievements`;
    case NotificationType.COMMUNITY_ACTIVITY:
      return data.postId ? `${baseUrl}community/${data.postId}` : `${baseUrl}community`;
    default:
      return null;
  }
}

export async function prewarmDeepLinkData(
  deepLink: ParsedDeepLink
): Promise<{ prewarmedCourse?: Course | null }> {
  if (deepLink.route === 'CourseViewer' && deepLink.params?.courseId) {
    const prewarmedCourse = await prewarmCourse(deepLink.params.courseId);
    return { prewarmedCourse };
  }

  return {};
}

export async function prewarmCourse(courseId: string) {
  try {
    const storedCourse = await offlineStorage.getCourse(courseId);
    if (storedCourse) {
      return storedCourse as Course;
    }

    if (courseId === sampleCourse.id) {
      return sampleCourse;
    }

    // If the app has an API endpoint for course detail, attempt a network fetch.
    // This is a safe fallback path and does not block the app if unavailable.
    try {
      const courseResponse = await fetch(`https://api.teachlink.com/courses/${courseId}`);
      if (courseResponse.ok) {
        const courseData = await courseResponse.json();
        return courseData as Course;
      }
    } catch (error) {
      console.warn('Failed to fetch course prewarm data from network:', error);
    }
  } catch (error) {
    console.warn('Failed to prewarm course data:', error);
  }

  return null;
}

export function getDeepLinkPath(deepLink: ParsedDeepLink): string {
  return getPathFromDeepLink(deepLink);
}
