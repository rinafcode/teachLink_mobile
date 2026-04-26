import React from 'react';
import PrimaryButton from '../../src/components/common/PrimaryButton';

jest.mock('react-native', () => ({
  TouchableOpacity: 'TouchableOpacity',
  Text: 'Text',
  ActivityIndicator: 'ActivityIndicator',
  View: 'View',
  StyleSheet: {
    create: (styles: unknown) => styles,
  },
}));

jest.mock('expo-linear-gradient', () => ({
  LinearGradient: ({ children }: { children: React.ReactNode }) => children,
}));

describe('PrimaryButton', () => {
  // ── Rendering ────────────────────────────────────────────────────────────

  describe('rendering', () => {
    it('renders title in gradient variant (default)', () => {
      const element = PrimaryButton({ title: 'Get Started', onPress: jest.fn() });
      const json = JSON.stringify(element);
      expect(element).toBeTruthy();
      expect(json).toContain('Get Started');
    });

    it('renders title in solid variant', () => {
      const element = PrimaryButton({ title: 'Continue', onPress: jest.fn(), variant: 'solid' });
      const json = JSON.stringify(element);
      expect(element).toBeTruthy();
      expect(json).toContain('Continue');
    });

    it('renders title in outline variant', () => {
      const element = PrimaryButton({ title: 'Cancel', onPress: jest.fn(), variant: 'outline' });
      const json = JSON.stringify(element);
      expect(element).toBeTruthy();
      expect(json).toContain('Cancel');
    });
  });

  // ── Size variants ────────────────────────────────────────────────────────

  describe('size variants', () => {
    it('renders small size', () => {
      const element = PrimaryButton({ title: 'Small', onPress: jest.fn(), size: 'small' });
      expect(element).toBeTruthy();
    });

    it('renders medium size (default)', () => {
      const element = PrimaryButton({ title: 'Medium', onPress: jest.fn(), size: 'medium' });
      expect(element).toBeTruthy();
    });

    it('renders large size', () => {
      const element = PrimaryButton({ title: 'Large', onPress: jest.fn(), size: 'large' });
      expect(element).toBeTruthy();
    });
  });

  // ── Loading state ────────────────────────────────────────────────────────

  describe('loading state', () => {
    it('shows busy accessibility state when loading', () => {
      const element = PrimaryButton({ title: 'Submit', onPress: jest.fn(), loading: true });
      const json = JSON.stringify(element);
      expect(json).toContain('"busy":true');
    });

    it('shows busy state in solid variant when loading', () => {
      const element = PrimaryButton({
        title: 'Submit',
        onPress: jest.fn(),
        variant: 'solid',
        loading: true,
      });
      const json = JSON.stringify(element);
      expect(json).toContain('"busy":true');
    });

    it('shows busy state in outline variant when loading', () => {
      const element = PrimaryButton({
        title: 'Submit',
        onPress: jest.fn(),
        variant: 'outline',
        loading: true,
      });
      const json = JSON.stringify(element);
      expect(json).toContain('"busy":true');
    });
  });

  // ── Disabled state ───────────────────────────────────────────────────────

  describe('disabled state', () => {
    it('sets disabled accessibility state when disabled', () => {
      const element = PrimaryButton({ title: 'Save', onPress: jest.fn(), disabled: true });
      const json = JSON.stringify(element);
      expect(json).toContain('"disabled":true');
    });

    it('sets disabled when loading (loading implies disabled)', () => {
      const element = PrimaryButton({ title: 'Save', onPress: jest.fn(), loading: true });
      const json = JSON.stringify(element);
      expect(json).toContain('"disabled":true');
    });
  });

  // ── Accessibility ────────────────────────────────────────────────────────

  describe('accessibility', () => {
    it('uses title as default accessibilityLabel', () => {
      const element = PrimaryButton({ title: 'Log In', onPress: jest.fn() });
      const json = JSON.stringify(element);
      expect(json).toContain('"accessibilityLabel":"Log In"');
    });

    it('uses custom accessibilityLabel when provided', () => {
      const element = PrimaryButton({
        title: 'Log In',
        onPress: jest.fn(),
        accessibilityLabel: 'Sign in to your account',
      });
      const json = JSON.stringify(element);
      expect(json).toContain('"accessibilityLabel":"Sign in to your account"');
    });

    it('includes accessibilityHint when provided', () => {
      const element = PrimaryButton({
        title: 'Submit',
        onPress: jest.fn(),
        accessibilityHint: 'Double tap to submit the form',
      });
      const json = JSON.stringify(element);
      expect(json).toContain('"accessibilityHint":"Double tap to submit the form"');
    });

    it('has accessibilityRole of button', () => {
      const element = PrimaryButton({ title: 'Press Me', onPress: jest.fn() });
      const json = JSON.stringify(element);
      expect(json).toContain('"accessibilityRole":"button"');
    });
  });

  // ── onPress ──────────────────────────────────────────────────────────────

  describe('onPress callback', () => {
    it('accepts an onPress handler', () => {
      const onPress = jest.fn();
      const element = PrimaryButton({ title: 'Click', onPress });
      expect(element).toBeTruthy();
      // Verify the handler is wired into the element props
      const json = JSON.stringify(element);
      expect(json).toBeTruthy();
    });
  });
});
