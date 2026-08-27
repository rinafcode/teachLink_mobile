import {
  AlertTriangle,
  BarChart2,
  CreditCard,
  Database,
  Download,
  Eye,
  Fingerprint as FingerprintPattern,
  Lock,
  LogOut,
  RefreshCw,
  Settings2,
  ShieldAlert,
  Sun,
  Trash2,
  User,
  Wifi,
  Zap,
} from 'lucide-react-native';
import React from 'react';

/**
 * Stable icon elements — created once at module level so React.memo on
 * SettingRow can compare props by reference and skip re-renders.
 */
export const ICON_EYE = <Eye size={18} color="#6366f1" />;
export const ICON_LOCK = <Lock size={18} color="#10b981" />;
export const ICON_FINGERPRINT = <FingerprintPattern size={18} color="#06b6d4" />;
export const ICON_USER = <User size={18} />;
export const ICON_CREDIT_CARD_YELLOW = <CreditCard size={18} color="#f59e0b" />;
export const ICON_CREDIT_CARD_GREEN = <CreditCard size={18} color="#10b981" />;
export const ICON_SUN = <Sun size={18} />;
export const ICON_DATABASE = <Database size={18} color="#eab308" />;
export const ICON_BAR_CHART = <BarChart2 size={18} />;
export const ICON_TRASH_RED = <Trash2 size={18} color="red" />;
export const ICON_DOWNLOAD_INDIGO = <Download size={18} color="#6366f1" />;
export const ICON_WIFI = <Wifi size={18} />;
export const ICON_DOWNLOAD = <Download size={18} />;
export const ICON_REFRESH = <RefreshCw size={18} />;
export const ICON_ZAP = <Zap size={18} color="#06b6d4" />;
export const ICON_SHIELD = <ShieldAlert size={18} color="#ef4444" />;
export const ICON_LOGOUT_RED = <LogOut size={18} color="red" />;
export const ICON_ALERT = <AlertTriangle size={18} color="#dc2626" />;
export const ICON_SETTINGS2 = <Settings2 size={16} color="#19c3e6" />;
