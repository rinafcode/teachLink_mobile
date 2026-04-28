import { lazy } from 'react';

export const MobileLogin = lazy(() =>
  import('../pages/mobile/MobileLogin').then((m) => ({ default: m.MobileLogin }))
);

export const PaymentHistory = lazy(() =>
  import('../pages/mobile/PaymentHistory').then((m) => ({ default: m.PaymentHistory }))
);

export const SettingsScreen = lazy(() => import('../pages/mobile/Settings'));
