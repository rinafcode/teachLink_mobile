export const NOTIFICATION_SCREEN_ALLOWLIST = new Set([
  'Home',
  'Courses',
  'CourseDetail',
  'Messages',
  'Chat',
  'Learning',
  'Community',
  'CommunityPost',
  'Achievements',
  'AchievementDetail',
] as const);

export const CSP_TRUST_TIERS = {
  restricted: "default-src 'none'; img-src 'self' data: https:; style-src 'self'; font-src 'self'; connect-src 'self'",
  interactive: "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.platform.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self' https://api.platform.com; frame-src 'self'",
  trusted: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.platform.com; style-src 'self' 'unsafe-inline'; img-src * data: https:; font-src 'self' https://fonts.gstatic.com; connect-src *; frame-src *; media-src 'self' https://media.platform.com",
} as const;

export type TrustTier = keyof typeof CSP_TRUST_TIERS;
