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

  // Course Events
  COURSE_STARTED = 'course_started',
  COURSE_COMPLETED = 'course_completed',

  // Quiz Events
  QUIZ_STARTED = 'quiz_started',
  QUIZ_COMPLETED = 'quiz_completed',

  // Content Interaction
  CONTENT_VIEW = 'content_view',
  CONTENT_SHARE = 'content_share',
  CONTENT_LIKE = 'content_like',

  // Button Clicks
  BUTTON_CLICK = 'button_click',

  // Performance & Infrastructure
  PERFORMANCE_METRIC = 'performance_metric',
  API_ERROR = 'api_error',
  CRASH_REPORT = 'crash_report',
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
  COURSE_VIEWER = 'course_viewer',
  QUIZ = 'quiz',
  SEARCH = 'search',
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
