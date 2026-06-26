import { getPathFromDeepLink, parseDeepLinkUrl } from '@/utils/linkParser';

describe('linkParser', () => {
  it('parses teachlink custom URL scheme for course viewer', () => {
    const deepLink = parseDeepLinkUrl('teachlink://course/course-demo-1');

    expect(deepLink).toEqual({
      route: 'CourseViewer',
      params: { courseId: 'course-demo-1' },
      attribution: {},
      url: 'teachlink://course/course-demo-1',
    });
  });

  it('parses universal links to the profile route', () => {
    const deepLink = parseDeepLinkUrl('https://teachlink.com/profile/123');

    expect(deepLink).toEqual({
      route: 'Profile',
      params: { userId: '123' },
      attribution: {},
      url: 'https://teachlink.com/profile/123',
    });
  });

  it('parses deferred attribution query parameters', () => {
    const deepLink = parseDeepLinkUrl(
      'https://teachlink.com/course/course-demo-1?utm_source=email&utm_medium=campaign&deferred=true'
    );

    expect(deepLink).toEqual({
      route: 'CourseViewer',
      params: { courseId: 'course-demo-1' },
      attribution: {
        source: 'email',
        medium: 'campaign',
        deferred: true,
      },
      url: 'https://teachlink.com/course/course-demo-1?utm_source=email&utm_medium=campaign&deferred=true',
    });
  });

  it('returns the expected expo-router path for a parsed QR scanner deep link', () => {
    const deepLink = parseDeepLinkUrl('teachlink://qr-scanner');
    expect(getPathFromDeepLink(deepLink as any)).toBe('/qr-scanner');
  });
});
