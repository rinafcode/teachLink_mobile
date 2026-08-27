/**
 * Analytics Sampling Policy
 *
 * Defines which events are sampled, at what rate, and what the per-session
 * event budget is. This is the single source of truth for analytics volume
 * control — the policy is enforced at the source (MobileAnalyticsService)
 * and in the batch queue (AnalyticsBatchQueue).
 *
 * See docs/PERFORMANCE_MONITORING.md for the human-readable policy document.
 */

import { AnalyticsEvent } from '../../utils/trackingEvents';

// ─── Event Frequency Classification ─────────────────────────────────────────

export type EventFrequency = 'critical' | 'high' | 'medium' | 'low';

/**
 * Maps every AnalyticsEvent to its expected frequency class.
 *
 * - `critical`: session lifecycle, auth, errors, crashes — always sent (100%)
 * - `high`: navigation, content interactions — sampled at 20%
 * - `medium`: user actions, button clicks — sampled at 10%
 * - `low`: performance metrics, web vitals, A/B — sampled at 5%
 */
export const EVENT_FREQUENCY: Record<AnalyticsEvent, EventFrequency> = {
  // ── Critical (100%) ──────────────────────────────────────────────
  [AnalyticsEvent.APP_LAUNCH]: 'critical',
  [AnalyticsEvent.SESSION_START]: 'critical',
  [AnalyticsEvent.SESSION_END]: 'critical',
  [AnalyticsEvent.AUTH_LOGIN]: 'critical',
  [AnalyticsEvent.AUTH_LOGOUT]: 'critical',
  [AnalyticsEvent.COURSE_STARTED]: 'critical',
  [AnalyticsEvent.COURSE_COMPLETED]: 'critical',
  [AnalyticsEvent.QUIZ_STARTED]: 'critical',
  [AnalyticsEvent.QUIZ_COMPLETED]: 'critical',
  [AnalyticsEvent.API_ERROR]: 'critical',
  [AnalyticsEvent.CRASH_REPORT]: 'critical',

  // ── High (20%) ───────────────────────────────────────────────────
  [AnalyticsEvent.SCREEN_VIEW]: 'high',
  [AnalyticsEvent.CONTENT_VIEW]: 'high',
  [AnalyticsEvent.CONTENT_SHARE]: 'high',
  [AnalyticsEvent.SEARCH_QUERY]: 'high',
  [AnalyticsEvent.FORM_SUBMIT]: 'high',

  // ── Medium (10%) ─────────────────────────────────────────────────
  [AnalyticsEvent.UI_CLICK]: 'medium',
  [AnalyticsEvent.BUTTON_CLICK]: 'medium',
  [AnalyticsEvent.CONTENT_LIKE]: 'medium',
  [AnalyticsEvent.REVIEW_REQUESTED]: 'medium',
  [AnalyticsEvent.REVIEW_PROMPT_SHOWN]: 'medium',
  [AnalyticsEvent.REVIEW_PROMPT_DISMISSED]: 'medium',

  // ── Low (5%) ─────────────────────────────────────────────────────
  [AnalyticsEvent.PERFORMANCE_METRIC]: 'low',
  [AnalyticsEvent.REACT_PROFILER_RENDER]: 'low',
  [AnalyticsEvent.REACT_PROFILER_SLOW_RENDER]: 'low',
  [AnalyticsEvent.AB_ASSIGNMENT]: 'low',
  [AnalyticsEvent.AB_EXPOSURE]: 'low',
  [AnalyticsEvent.DEVICE_COMPLEXITY_ASSIGNED]: 'low',
  [AnalyticsEvent.APP_BACKGROUND]: 'low',
  [AnalyticsEvent.APP_FOREGROUND]: 'low',
  [AnalyticsEvent.UPDATE_CHECK_STARTED]: 'low',
  [AnalyticsEvent.UPDATE_AVAILABLE]: 'low',
  [AnalyticsEvent.UPDATE_NOT_AVAILABLE]: 'low',
  [AnalyticsEvent.UPDATE_DOWNLOAD_STARTED]: 'low',
  [AnalyticsEvent.UPDATE_DOWNLOAD_COMPLETED]: 'low',
  [AnalyticsEvent.UPDATE_DOWNLOAD_FAILED]: 'low',
  [AnalyticsEvent.UPDATE_APPLIED]: 'low',
  [AnalyticsEvent.UPDATE_DISMISSED]: 'low',
  [AnalyticsEvent.UPDATE_STORE_REDIRECT]: 'low',
  [AnalyticsEvent.WEB_VITALS_LCP]: 'low',
  [AnalyticsEvent.WEB_VITALS_FID]: 'low',
  [AnalyticsEvent.WEB_VITALS_CLS]: 'low',
  [AnalyticsEvent.WEB_VITALS_FCP]: 'low',
  [AnalyticsEvent.WEB_VITALS_TTFB]: 'low',
  [AnalyticsEvent.WEB_VITALS_REGRESSION]: 'low',
};

// ─── Sampling Rates ─────────────────────────────────────────────────────────

/**
 * Sampling rate per frequency class. Value is the probability of sending
 * an event (0.0 = never send, 1.0 = always send).
 *
 * Critical events bypass this check entirely and are always sent.
 */
export const SAMPLING_RATES: Record<EventFrequency, number> = {
  critical: 1.0,
  high: 0.2,
  medium: 0.1,
  low: 0.05,
};

/**
 * High-frequency throttle: max events per second for events tagged
 * with `event_category: 'high_frequency'` in their properties.
 * This is a per-event_name rate limiter, applied before sampling.
 */
export const HIGH_FREQUENCY_MAX_PER_SECOND = 10;

// ─── Session Event Budget ───────────────────────────────────────────────────

/**
 * Maximum number of events that can be sent per session.
 * Once the budget is exhausted, all subsequent events are silently dropped.
 * The budget is tracked by AnalyticsBatchQueue.
 *
 * Set to 0 for unlimited (not recommended in production).
 */
export const SESSION_EVENT_BUDGET = 500;

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Should this event be sampled at the given frequency?
 * Returns true if the event should be sent, false if it should be dropped.
 */
export function shouldSampleEvent(frequency: EventFrequency): boolean {
  if (frequency === 'critical') return true;
  return Math.random() < SAMPLING_RATES[frequency];
}

/**
 * Get the frequency class for an event.
 */
export function getEventFrequency(event: AnalyticsEvent): EventFrequency {
  return EVENT_FREQUENCY[event] ?? 'medium';
}
