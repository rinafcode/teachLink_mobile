export type DeepLinkRoute =
  | 'Home'
  | 'Search'
  | 'Profile'
  | 'Settings'
  | 'NotificationSettings'
  | 'CourseViewer'
  | 'QRScanner'
  | 'Messages'
  | 'Learning'
  | 'Community'
  | 'Achievements'
  | 'Unsupported';

export interface DeepLinkParams {
  [key: string]: string | undefined;
}

export interface DeepLinkAttribution {
  source?: string;
  medium?: string;
  campaign?: string;
  deferred?: boolean;
  [key: string]: string | boolean | undefined;
}

export interface ParsedDeepLink {
  route: DeepLinkRoute;
  params?: DeepLinkParams;
  attribution?: DeepLinkAttribution;
  url: string;
}

const KNOWN_HOSTS = ['teachlink.com', 'www.teachlink.com', 'teachlink.page.link'];
const FALLBACK_BASE = 'https://teachlink.com';

function normalizeUrl(input: string): string {
  const url = input.trim();

  if (url.startsWith('teachlink://')) {
    return url.replace(/^teachlink:\/\//i, `${FALLBACK_BASE}/`);
  }

  if (/^https?:\/\/(www\.)?teachlink\.com/i.test(url)) {
    return url;
  }

  if (/^https?:\/\/(www\.)?teachlink\.page\.link/i.test(url)) {
    return url;
  }

  return `${FALLBACK_BASE}/${url.replace(/^\//, '')}`;
}

function extractAttribution(searchParams: URLSearchParams): DeepLinkAttribution {
  const attribution: DeepLinkAttribution = {};

  const source = searchParams.get('utm_source');
  const medium = searchParams.get('utm_medium');
  const campaign = searchParams.get('utm_campaign');
  const deferred = searchParams.get('deferred');

  if (source) attribution.source = source;
  if (medium) attribution.medium = medium;
  if (campaign) attribution.campaign = campaign;
  if (deferred) attribution.deferred = deferred === 'true';

  return attribution;
}

export function parseDeepLinkUrl(rawUrl: string): ParsedDeepLink | null {
  try {
    const normalized = normalizeUrl(rawUrl);
    const parsedUrl = new URL(normalized);
    const host = parsedUrl.hostname.toLowerCase();

    if (!KNOWN_HOSTS.includes(host) && !normalized.startsWith('https://teachlink.page.link')) {
      return null;
    }

    const segments = parsedUrl.pathname
      .replace(/^\/+|\/+$/g, '')
      .split('/')
      .filter(Boolean);

    const attribution = extractAttribution(parsedUrl.searchParams);
    const route = segments[0] ?? 'home';
    const id = segments[1];

    switch (route.toLowerCase()) {
      case 'course':
        return {
          route: 'CourseViewer',
          params: { courseId: id },
          attribution,
          url: rawUrl,
        };
      case 'courses':
        return {
          route: 'Search',
          attribution,
          url: rawUrl,
        };
      case 'messages':
        return {
          route: 'Messages',
          params: { conversationId: id },
          attribution,
          url: rawUrl,
        };
      case 'learn':
      case 'learning':
        return {
          route: 'Learning',
          attribution,
          url: rawUrl,
        };
      case 'achievements':
        return {
          route: id ? 'Achievements' : 'Achievements',
          params: { achievementId: id },
          attribution,
          url: rawUrl,
        };
      case 'community':
        return {
          route: 'Community',
          params: { postId: id },
          attribution,
          url: rawUrl,
        };
      case 'profile':
        return {
          route: 'Profile',
          params: { userId: id },
          attribution,
          url: rawUrl,
        };
      case 'search':
        return {
          route: 'Search',
          attribution,
          url: rawUrl,
        };
      case 'settings':
        return {
          route: segments[1] === 'notifications' ? 'NotificationSettings' : 'Settings',
          attribution,
          url: rawUrl,
        };
      case 'qr-scanner':
      case 'scan':
        return {
          route: 'QRScanner',
          attribution,
          url: rawUrl,
        };
      case 'home':
      case '':
        return {
          route: 'Home',
          attribution,
          url: rawUrl,
        };
      default:
        return {
          route: 'Home',
          attribution,
          url: rawUrl,
        };
    }
  } catch {
    return null;
  }
}

export function getPathFromDeepLink(deepLink: ParsedDeepLink): string {
  const { route, params } = deepLink;

  switch (route) {
    case 'CourseViewer':
      return `/course-viewer${params?.courseId ? `?courseId=${encodeURIComponent(params.courseId)}` : ''}`;
    case 'Profile':
      return `/profile/${encodeURIComponent(params?.userId ?? 'me')}`;
    case 'Settings':
      return '/settings';
    case 'NotificationSettings':
      return '/settings?tab=notifications';
    case 'Search':
      return '/search';
    case 'QRScanner':
      return '/qr-scanner';
    case 'Messages':
      return '/search?query=messages';
    case 'Learning':
      return '/search?query=learning';
    case 'Community':
      return '/search?query=community';
    case 'Achievements':
      return '/search?query=achievements';
    case 'Home':
    default:
      return '/';
  }
}
