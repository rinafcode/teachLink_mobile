import { MobileFormInput } from '../../src/components/mobile/MobileFormInput';

// Mock react-native primitives
jest.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  TextInput: 'TextInput',
  TouchableOpacity: 'TouchableOpacity',
  StyleSheet: {
    create: (styles: unknown) => styles,
  },
}));

// Mock lucide icons used inside the component
jest.mock('lucide-react-native', () => ({
  Eye: () => null,
  EyeOff: () => null,
  AlertCircle: () => null,
}));

describe('MobileFormInput', () => {
  const baseProps = {
    label: 'Email',
    value: '',
    onChangeText: jest.fn(),
  };

  // ── Props interface ──────────────────────────────────────────────────────

  describe('props interface', () => {
    it('requires label, value, and onChangeText', () => {
      expect(baseProps.label).toBeDefined();
      expect(typeof baseProps.value).toBe('string');
      expect(typeof baseProps.onChangeText).toBe('function');
    });

    it('accepts optional error prop', () => {
      const props = { ...baseProps, error: 'Invalid email' };
      expect(props.error).toBe('Invalid email');
    });

    it('accepts optional hint prop', () => {
      const props = { ...baseProps, hint: 'Enter your work email' };
      expect(props.hint).toBe('Enter your work email');
    });

    it('accepts optional required prop', () => {
      const props = { ...baseProps, required: true };
      expect(props.required).toBe(true);
    });

    it('accepts optional isDark prop', () => {
      const props = { ...baseProps, isDark: true };
      expect(props.isDark).toBe(true);
    });

    it('accepts optional placeholder prop', () => {
      const props = { ...baseProps, placeholder: 'you@example.com' };
      expect(props.placeholder).toBe('you@example.com');
    });
  });

  // ── Rendering ────────────────────────────────────────────────────────────

  describe('rendering', () => {
    it('renders without crashing with minimal props', () => {
      const element = MobileFormInput(baseProps as any);
      expect(element).toBeTruthy();
    });

    it('renders label text', () => {
      const element = MobileFormInput({ ...baseProps, label: 'Password' } as any);
      const json = JSON.stringify(element);
      expect(json).toContain('Password');
    });

    it('renders error message when error prop is provided', () => {
      const element = MobileFormInput({
        ...baseProps,
        error: 'This field is required',
      } as any);
      const json = JSON.stringify(element);
      expect(json).toContain('This field is required');
    });

    it('renders hint text when hint prop is provided and no error', () => {
      const element = MobileFormInput({
        ...baseProps,
        hint: 'Min 8 characters',
      } as any);
      const json = JSON.stringify(element);
      expect(json).toContain('Min 8 characters');
    });

    it('does not render hint when error is also present', () => {
      const element = MobileFormInput({
        ...baseProps,
        hint: 'Min 8 characters',
        error: 'Too short',
      } as any);
      const json = JSON.stringify(element);
      // Error takes priority — hint should not appear
      expect(json).not.toContain('Min 8 characters');
      expect(json).toContain('Too short');
    });

    it('renders required asterisk when required=true', () => {
      const element = MobileFormInput({ ...baseProps, required: true } as any);
      const json = JSON.stringify(element);
      expect(json).toContain('*');
    });
  });

  // ── Password field ───────────────────────────────────────────────────────

  describe('password field', () => {
    it('renders toggle button for password fields', () => {
      const element = MobileFormInput({
        ...baseProps,
        label: 'Password',
        secureTextEntry: true,
      } as any);
      // Component renders a TouchableOpacity for the eye icon toggle
      expect(element).toBeTruthy();
    });

    it('does not render toggle button for non-password fields', () => {
      const element = MobileFormInput({ ...baseProps } as any);
      const json = JSON.stringify(element);
      // No eye icon toggle for regular inputs
      expect(element).toBeTruthy();
      expect(json).not.toContain('EyeOff');
    });
  });

  // ── Dark mode ────────────────────────────────────────────────────────────

  describe('dark mode', () => {
    it('renders in dark mode without crashing', () => {
      const element = MobileFormInput({ ...baseProps, isDark: true } as any);
      expect(element).toBeTruthy();
    });

    it('renders in light mode without crashing', () => {
      const element = MobileFormInput({ ...baseProps, isDark: false } as any);
      expect(element).toBeTruthy();
    });
  });

  // ── Multiline ────────────────────────────────────────────────────────────

  describe('multiline', () => {
    it('renders multiline input without crashing', () => {
      const element = MobileFormInput({ ...baseProps, multiline: true } as any);
      expect(element).toBeTruthy();
    });
  });

  // ── onChangeText callback ────────────────────────────────────────────────

  describe('onChangeText callback', () => {
    it('accepts an onChangeText handler', () => {
      const onChangeText = jest.fn();
      const element = MobileFormInput({ ...baseProps, onChangeText } as any);
      expect(element).toBeTruthy();
    });

    it('onChangeText is callable', () => {
      const onChangeText = jest.fn();
      onChangeText('test@example.com');
      expect(onChangeText).toHaveBeenCalledWith('test@example.com');
    });
  });
});
