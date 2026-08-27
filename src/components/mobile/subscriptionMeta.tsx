import { Crown, Zap, Star } from 'lucide-react-native';
import React from 'react';

import { SubscriptionTier } from '../../services/mobilePayments';

export const TIER_META: Record<
  SubscriptionTier,
  { label: string; colors: [string, string]; icon: React.ReactNode }
> = {
  free: {
    label: 'Free',
    colors: ['#94a3b8', '#64748b'],
    icon: <Star size={18} color="#fff" />,
  },
  pro: {
    label: 'Pro',
    colors: ['#20afe7', '#586ce9'],
    icon: <Zap size={18} color="#fff" />,
  },
  premium: {
    label: 'Premium',
    colors: ['#d97706', '#f59e0b'],
    icon: <Crown size={18} color="#fff" />,
  },
};

export const FREE_FEATURES = [
  '5 courses per month',
  'Standard video quality',
  'Community forum access',
  'Mobile app access',
];
