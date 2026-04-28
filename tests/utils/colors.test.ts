import { getColor, getColors } from '../../src/utils/colors';

describe('colors utilities', () => {
    it('returns light theme palette from getColors', () => {
        const light = getColors('light');

        expect(light.background).toBe('hsl(220, 20%, 95%)');
        expect(light.card).toBe('hsl(0, 0%, 100%)');
        expect(light.primary).toBe('hsl(220, 85%, 57%)');
        expect(light.secondary).toBe('hsl(190, 80%, 50%)');
        expect(light.accent).toBe('hsl(250, 70%, 65%)');
    });

    it('returns dark theme palette from getColors', () => {
        const dark = getColors('dark');

        expect(dark.background).toBe('hsl(220, 25%, 15%)');
        expect(dark.card).toBe('hsl(220, 25%, 20%)');
        expect(dark.primary).toBe('hsl(220, 85%, 60%)');
        expect(dark.secondary).toBe('hsl(190, 80%, 55%)');
        expect(dark.accent).toBe('hsl(250, 70%, 70%)');
    });

    it('returns a specific color from getColor', () => {
        expect(getColor('primary', 'light')).toBe(getColors('light').primary);
        expect(getColor('card', 'dark')).toBe(getColors('dark').card);
    });
});
