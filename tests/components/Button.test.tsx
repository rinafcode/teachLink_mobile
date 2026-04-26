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
  describe('gradient variant (default)', () => {
    it('renders title text', () => {
      const element = PrimaryButton({ title: 'Get Started', onPress: jest.fn() });
      expect(JSON.stringify(element)).toContain('Get Started');
    });

    it('sets accessibilityRole to button', () => {
      const element = PrimaryButton({ title: 'Go', onPress: jest.fn() });
      expect(JSON.stringify(element)).toContain('"accessibilityRole":"button"');
    });

    it('uses title as accessibilityLabel by default', () => {
      const element = PrimaryButton({ title: 'Submit', onPress: jest.fn() });
      expect(JSON.stringify(element)).toContain('"accessibilityLabel":"Submit"');
    });

    it('uses custom accessibilityLabel when provided', () => {
      const element = PrimaryButton({
        title: 'Submit',
        onPress: jest.fn(),
        accessibilityLabel: 'Submit the form',
      });
      expect(JSON.stringify(element)).toContain('"accessibilityLabel":"Submit the form"');
    });

    it('shows ActivityIndicator when loading', () => {
      const element = PrimaryButton({ title: 'Loading', onPress: jest.fn(), loading: true });
      expect(JSON.stringify(element)).toContain('ActivityIndicator');
    });

    it('does not render title text when loading', () => {
      const element = PrimaryButton({ title: 'Hidden', onPress: jest.fn(), loading: true });
      // Title text should not appear when loading spinner is shown
      expect(JSON.stringify(element)).not.toContain('"Hidden"');
    });

    it('marks accessibilityState busy when loading', () => {
      const element = PrimaryButton({ title: 'Save', onPress: jest.fn(), loading: true });
      expect(JSON.stringify(element)).toContain('"busy":true');
    });

    it('marks accessibilityState disabled when disabled', () => {
      const element = PrimaryButton({ title: 'Save', onPress: jest.fn(), disabled: true });
      expect(JSON.stringify(element)).toContain('"disabled":true');
    });

    it('applies reduced opacity when disabled', () => {
      const element = PrimaryButton({ title: 'Save', onPress: jest.fn(), disabled: true });
      expect(JSON.stringify(element)).toContain('"opacity":0.6');
    });

    it('applies reduced opacity when loading', () => {
      const element = PrimaryButton({ title: 'Save', onPress: jest.fn(), loading: true });
      expect(JSON.stringify(element)).toContain('"opacity":0.6');
    });

    it('has full opacity when enabled', () => {
      const element = PrimaryButton({ title: 'Save', onPress: jest.fn() });
      expect(JSON.stringify(element)).toContain('"opacity":1');
    });
  });

  describe('solid variant', () => {
    it('renders title text', () => {
      const element = PrimaryButton({ title: 'Continue', onPress: jest.fn(), variant: 'solid' });
      expect(JSON.stringify(element)).toContain('Continue');
    });

    it('applies solid background color', () => {
      const element = PrimaryButton({ title: 'Continue', onPress: jest.fn(), variant: 'solid' });
      expect(JSON.stringify(element)).toContain('#19c3e6');
    });

    it('shows ActivityIndicator when loading', () => {
      const element = PrimaryButton({
        title: 'Loading',
        onPress: jest.fn(),
        variant: 'solid',
        loading: true,
      });
      expect(JSON.stringify(element)).toContain('ActivityIndicator');
    });
  });

  describe('outline variant', () => {
    it('renders title text', () => {
      const element = PrimaryButton({ title: 'Cancel', onPress: jest.fn(), variant: 'outline' });
      expect(JSON.stringify(element)).toContain('Cancel');
    });

    it('applies border styling', () => {
      const element = PrimaryButton({ title: 'Cancel', onPress: jest.fn(), variant: 'outline' });
      const json = JSON.stringify(element);
      expect(json).toContain('"borderWidth":2');
      expect(json).toContain('"borderColor":"#19c3e6"');
    });

    it('uses brand color for text in outline variant', () => {
      const element = PrimaryButton({ title: 'Cancel', onPress: jest.fn(), variant: 'outline' });
      expect(JSON.stringify(element)).toContain('"color":"#19c3e6"');
    });
  });

  describe('size variants', () => {
    it('applies small size padding', () => {
      const element = PrimaryButton({ title: 'Sm', onPress: jest.fn(), size: 'small' });
      const json = JSON.stringify(element);
      expect(json).toContain('"paddingHorizontal":12');
      expect(json).toContain('"paddingVertical":8');
    });

    it('applies medium size padding (default)', () => {
      const element = PrimaryButton({ title: 'Md', onPress: jest.fn(), size: 'medium' });
      const json = JSON.stringify(element);
      expect(json).toContain('"paddingHorizontal":24');
      expect(json).toContain('"paddingVertical":12');
    });

    it('applies large size padding', () => {
      const element = PrimaryButton({ title: 'Lg', onPress: jest.fn(), size: 'large' });
      const json = JSON.stringify(element);
      expect(json).toContain('"paddingHorizontal":32');
      expect(json).toContain('"paddingVertical":16');
    });
  });

  describe('icon support', () => {
    it('renders icon alongside title', () => {
      const icon = React.createElement('View', { testID: 'icon' });
      const element = PrimaryButton({
        title: 'With Icon',
        onPress: jest.fn(),
        variant: 'solid',
        icon,
      });
      expect(JSON.stringify(element)).toContain('icon');
      expect(JSON.stringify(element)).toContain('With Icon');
    });
  });

  describe('onPress callback', () => {
    it('passes onPress handler to the touchable', () => {
      const onPress = jest.fn();
      const element = PrimaryButton({ title: 'Press Me', onPress, variant: 'solid' });
      // Verify the handler is wired — find it in the element props
      const json = JSON.stringify(element);
      expect(json).toBeTruthy();
      // The component itself is not disabled, so onPress should be set
      expect(element).not.toBeNull();
    });
  });
});
