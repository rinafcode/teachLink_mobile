import { fireEvent, render, waitFor } from '@testing-library/react-native';
import React from 'react';

import { MobileFormInput } from '../../src/components/mobile/MobileFormInput';
import { formCacheService, setCachedFieldValue } from '../../src/services/formCache';

jest.mock('lucide-react-native', () => ({
  Eye: () => null,
  EyeOff: () => null,
  AlertCircle: () => null,
}));

jest.mock('../../src/hooks', () => ({
  useDynamicFontSize: () => ({ scale: (value: number) => value }),
}));

jest.mock('../../src/services/formCache', () => ({
  formCacheService: {
    loadFormCache: jest.fn(),
    getSuggestionForField: jest.fn(),
  },
  setCachedFieldValue: jest.fn(),
}));

describe('MobileFormInput cache behavior', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows a cached suggestion when the field is focused', async () => {
    (formCacheService.loadFormCache as jest.Mock).mockResolvedValue({
      email: { value: 'cached@example.com', updatedAt: Date.now() },
    });
    (formCacheService.getSuggestionForField as jest.Mock).mockReturnValue('cached@example.com');

    const onChangeText = jest.fn();
    const { getByPlaceholderText, getByLabelText } = render(
      <MobileFormInput
        label="Email"
        value=""
        onChangeText={onChangeText}
        placeholder="you@example.com"
        cacheKey="email"
      />
    );

    fireEvent(getByPlaceholderText('you@example.com'), 'focus');

    await waitFor(() => expect(getByLabelText('Use cached value cached@example.com')).toBeTruthy());

    fireEvent.press(getByLabelText('Use cached value cached@example.com'));
    expect(onChangeText).toHaveBeenCalledWith('cached@example.com');
  });

  it('persists the field value on blur when cacheKey is set', () => {
    const onChangeText = jest.fn();
    const { getByPlaceholderText } = render(
      <MobileFormInput
        label="Email"
        value="new@example.com"
        onChangeText={onChangeText}
        placeholder="you@example.com"
        cacheKey="email"
      />
    );

    fireEvent(getByPlaceholderText('you@example.com'), 'blur');

    expect(setCachedFieldValue).toHaveBeenCalledWith('email', 'new@example.com');
  });
});
