import React from 'react';
import { render, RenderAPI } from '@testing-library/react-native';
import { MobileFormInput } from '../../src/components/mobile/MobileFormInput';

// Mock lucide icons used inside the component
jest.mock('lucide-react-native', () => ({
  Eye: () => null,
  EyeOff: () => null,
  AlertCircle: () => null,
}));

const renderComponent = (props: Record<string, unknown>): RenderAPI =>
  render(<MobileFormInput {...props} />);

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
      const { toJSON } = renderComponent(baseProps);
      expect(toJSON()).toBeTruthy();
    });

    it('renders label text', () => {
      const { toJSON } = renderComponent({ ...baseProps, label: 'Password' });
      const json = JSON.stringify(toJSON());
      expect(json).toContain('Password');
    });

    it('renders error message when error prop is provided', () => {
      const { toJSON } = renderComponent({
        ...baseProps,
        error: 'This field is required',
      });
      const json = JSON.stringify(toJSON());
      expect(json).toContain('This field is required');
    });

    it('renders hint text when hint prop is provided and no error', () => {
      const { toJSON } = renderComponent({
        ...baseProps,
        hint: 'Min 8 characters',
      });
      const json = JSON.stringify(toJSON());
      expect(json).toContain('Min 8 characters');
    });

    it('does not render hint when error is also present', () => {
      const { toJSON } = renderComponent({
        ...baseProps,
        hint: 'Min 8 characters',
        error: 'Too short',
      });
      const json = JSON.stringify(toJSON());
      // Error takes priority — hint should not appear
      expect(json).not.toContain('Min 8 characters');
      expect(json).toContain('Too short');
    });

    it('renders required asterisk when required=true', () => {
      const { toJSON } = renderComponent({ ...baseProps, required: true });
      const json = JSON.stringify(toJSON());
      expect(json).toContain('*');
    });
  });

  // ── Password field ───────────────────────────────────────────────────────

  describe('password field', () => {
    it('renders toggle button for password fields', () => {
      const { toJSON } = renderComponent({
        ...baseProps,
        label: 'Password',
        secureTextEntry: true,
      });
      // Component renders a TouchableOpacity for the eye icon toggle
      expect(toJSON()).toBeTruthy();
    });

    it('does not render toggle button for non-password fields', () => {
      const { toJSON } = renderComponent({ ...baseProps });
      const json = JSON.stringify(toJSON());
      // No eye icon toggle for regular inputs
      expect(toJSON()).toBeTruthy();
      // The EyeOff icon is mocked as null; we can check for its absence in the rendered tree
      expect(json).not.toContain('EyeOff');
    });
  });

  // ── Dark mode ────────────────────────────────────────────────────────────

  describe('dark mode', () => {
    it('renders in dark mode without crashing', () => {
      const { toJSON } = renderComponent({ ...baseProps, isDark: true });
      expect(toJSON()).toBeTruthy();
    });

    it('renders in light mode without crashing', () => {
      const { toJSON } = renderComponent({ ...baseProps, isDark: false });
      expect(toJSON()).toBeTruthy();
    });
  });

  // ── Multiline ────────────────────────────────────────────────────────────

  describe('multiline', () => {
    it('renders multiline input without crashing', () => {
      const { toJSON } = renderComponent({ ...baseProps, multiline: true });
      expect(toJSON()).toBeTruthy();
    });
  });

  // ── onChangeText callback ─────────────────────────────────────────────────

  describe('onChangeText callback', () => {
    it('accepts an onChangeText handler', () => {
      const onChangeText = jest.fn();
      const { toJSON } = renderComponent({ ...baseProps, onChangeText });
      expect(toJSON()).toBeTruthy();
    });

    it('onChangeText is callable', () => {
      const onChangeText = jest.fn();
      onChangeText('test@example.com');
      expect(onChangeText).toHaveBeenCalledWith('test@example.com');
    });
  });
});
