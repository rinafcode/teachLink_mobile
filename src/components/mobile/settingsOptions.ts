import { PickerOption } from './SettingsPicker';
import { DownloadQuality, ProfileVisibility } from '../../store/settingsStore';

export const VISIBILITY_OPTIONS: PickerOption<ProfileVisibility>[] = [
  { label: 'Public', value: 'public' },
  { label: 'Friends Only', value: 'friends_only' },
  { label: 'Private', value: 'private' },
];

export const THEME_OPTIONS: PickerOption<'light' | 'dark'>[] = [
  { label: 'Light', value: 'light' },
  { label: 'Dark', value: 'dark' },
];

export const QUALITY_OPTIONS: PickerOption<DownloadQuality>[] = [
  { label: 'Low', value: 'low' },
  { label: 'Medium', value: 'medium' },
  { label: 'High', value: 'high' },
];
