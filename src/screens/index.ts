import { lazyScreen } from '../utils/LazyScreen';

export const MobileLogin = lazyScreen(() =>
  import('../pages/mobile/MobileLogin').then((m) => ({ default: m.MobileLogin }))
);

export const PaymentHistory = lazyScreen(() =>
  import('../pages/mobile/PaymentHistory').then((m) => ({ default: m.PaymentHistory }))
);

export { default as SettingsScreen } from '../pages/mobile/Settings';
