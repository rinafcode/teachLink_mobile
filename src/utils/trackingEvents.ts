/**
 * Enum of all tracked analytics events in the application.
 * Using a central enum ensures consistency and prevents typos.
 */
export enum AnalyticsEvent {
  // Session Events
  APP_LAUNCH = 'app_launch',
  SESSION_START = 'session_start',
  SESSION_END = 'session_end',

  // Navigation Events
  SCREEN_VIEW = 'screen_view',

  // User Actions
  UI_CLICK = 'ui_click',
  FORM_SUBMIT = 'form_submit',
  AUTH_LOGIN = 'auth_login',
  AUTH_LOGOUT = 'auth_logout',
  SEARCH_QUERY = 'search_query',

  // Content Interaction
  CONTENT_VIEW = 'content_view',
  CONTENT_SHARE = 'content_share',
  CONTENT_LIKE = 'content_like',

  // Performance & Infrastructure
  PERFORMANCE_METRIC = 'performance_metric',
  API_ERROR = 'api_error',
  CRASH_REPORT = 'crash_report',

  // OTA Update Events
  UPDATE_CHECK_STARTED = 'update_check_started',
  UPDATE_AVAILABLE = 'update_available',
  UPDATE_NOT_AVAILABLE = 'update_not_available',
  UPDATE_DOWNLOAD_STARTED = 'update_download_started',
  UPDATE_DOWNLOAD_COMPLETE = 'update_download_complete',
  UPDATE_DOWNLOAD_FAILED = 'update_download_failed',
  UPDATE_APPLIED = 'update_applied',
  UPDATE_DISMISSED = 'update_dismissed',
  UPDATE_CHECK_FAILED = 'update_check_failed',
}

/**
 * Standard properties that can be attached to any event.
 */
export interface EventProperties {
  [key: string]: string | number | boolean | null | undefined;
}

/**
 * Common screen names for type safety.
 */
export enum ScreenName {
  HOME = 'home',
  EXPLORE = 'explore',
  PROFILE = 'profile',
  SETTINGS = 'settings',
  CHAT = 'chat',
  CONTENT_DETAIL = 'content_detail',
  LOGIN = 'login',
  SIGNUP = 'signup',
}

/**
 * Types of performance metrics tracked.
 */
export enum PerformanceMetric {
  TTI = 'time_to_interactive',
  APP_LOAD_TIME = 'app_load_time',
  SCREEN_TRANSITION_TIME = 'screen_transition_time',
  API_RESPONSE_TIME = 'api_response_time',
}
