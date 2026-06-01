import { render } from '@testing-library/react-native';
import React from 'react';
import { Text } from 'react-native';

import { AccessibleModal } from '../../src/components/common/AccessibleModal';

describe('AccessibleModal Component', () => {
  it('renders children when visible is true', () => {
    const { getByText } = render(
      <AccessibleModal visible={true} onClose={jest.fn()} accessibilityLabel="Test Dialog">
        <Text>Modal Content</Text>
      </AccessibleModal>
    );

    expect(getByText('Modal Content')).toBeTruthy();
  });

  it('sets accessibility props correctly for dialog role', () => {
    const { getByLabelText } = render(
      <AccessibleModal visible={true} onClose={jest.fn()} accessibilityLabel="Test Dialog">
        <Text>Content</Text>
      </AccessibleModal>
    );

    const dialog = getByLabelText('Test Dialog');
    expect(dialog.props.accessibilityRole).toBe('dialog');
    expect(dialog.props.accessibilityViewIsModal).toBe(true);
  });
});
