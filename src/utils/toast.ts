// ─── Toast helpers ────────────────────────────────────────────────────────────
// Wraps whatever toast library the project uses (e.g. react-native-toast-message,
// burnt, react-hot-toast) behind a stable interface so imports don't scatter
// library-specific calls throughout the codebase.

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastOptions {
  /** How long the toast stays visible in milliseconds. Default: 4000 */
  duration?: number;
  /** Optional action label shown alongside the message. */
  actionLabel?: string;
  onActionPress?: () => void;
}

function show(type: ToastType, message: string, options: ToastOptions = {}): void {
  // Real implementation — swap the body for your toast library:
  //
  // Toast.show({
  //   type,
  //   text1: message,
  //   visibilityTime: options.duration ?? 4000,
  // });
  //
  // For now, fall back to console so nothing crashes in tests or stubs.
  const prefix = `[${type.toUpperCase()}]`;
  // eslint-disable-next-line no-console
  console.log(`${prefix} ${message}`);
}

export function showSuccessToast(message: string, options?: ToastOptions): void {
  show('success', message, options);
}

export function showErrorToast(message: string, options?: ToastOptions): void {
  show('error', message, options);
}

export function showInfoToast(message: string, options?: ToastOptions): void {
  show('info', message, options);
}

export function showWarningToast(message: string, options?: ToastOptions): void {
  show('warning', message, options);
}