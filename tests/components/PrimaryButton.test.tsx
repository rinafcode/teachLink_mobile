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
    it('renders title in solid variant', () => {
        const element = PrimaryButton({
            title: 'Continue',
            onPress: jest.fn(),
            variant: 'solid',
        });

        expect(element).toBeTruthy();
        expect(JSON.stringify(element)).toContain('Continue');
        expect(JSON.stringify(element)).toContain('"accessibilityLabel":"Continue"');
        expect(JSON.stringify(element)).toContain('"accessibilityRole":"button"');
    });

    it('renders loading state for gradient variant', () => {
        const element = PrimaryButton({
            title: 'Submit',
            onPress: jest.fn(),
            loading: true,
        });

        expect(element).toBeTruthy();
        expect(JSON.stringify(element)).toContain('"accessibilityLabel":"Submit"');
        expect(JSON.stringify(element)).toContain('"busy":true');
    });
});
