jest.mock('react-native-safe-area-context', () => ({
    useSafeAreaInsets: jest.fn(() => ({
        top: 24,
        bottom: 16,
        left: 8,
        right: 8,
    })),
}));

import { useSafeArea } from '../../src/hooks';

describe('useSafeArea', () => {
    it('maps inset values and helper paddings', () => {
        const result = useSafeArea();

        expect(result.top).toBe(24);
        expect(result.bottom).toBe(16);
        expect(result.left).toBe(8);
        expect(result.right).toBe(8);
        expect(result.safePaddingTop(10)).toEqual({ paddingTop: 34 });
        expect(result.safePaddingBottom(4)).toEqual({ paddingBottom: 20 });
    });
});
