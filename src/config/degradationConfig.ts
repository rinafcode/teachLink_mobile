export type ServiceName = 'streaming' | 'payment';
export type FeatureFlagKey = 'streaming_courses' | 'payment_form';

export interface FeatureFlagEntry {
  flagKey: FeatureFlagKey;
  adminOverride?: boolean;
}

export const HEALTH_TO_FEATURE_MAP: Record<ServiceName, FeatureFlagEntry[]> = {
  streaming: [{ flagKey: 'streaming_courses', adminOverride: false }],
  payment:   [{ flagKey: 'payment_form',      adminOverride: false }],
};

export const DEGRADED_STATUSES = ['degraded', 'down', 'error', 'unhealthy'] as const;
export type DegradedStatus = (typeof DEGRADED_STATUSES)[number];

export function isServiceDegraded(status: string): boolean {
  return (DEGRADED_STATUSES as readonly string[]).includes(status);
}
