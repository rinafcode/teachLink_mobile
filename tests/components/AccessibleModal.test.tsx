import { render } from '@testing-library/react-native';
import React from 'react';
import { Text } from 'react-native';

import { AccessibleModal } from '../../src/components/common/AccessibleModal';
import { ModalPortalProvider } from '../../src/components/common/ModalPortal';

describe('AccessibleModal Component', () => {
  describe('inline rendering (usePortal=false)', () => {
    it('renders children when visible is true', () => {
      const { getByText } = render(
        <AccessibleModal
          visible={true}
          onClose={jest.fn()}
          accessibilityLabel="Test Dialog"
          usePortal={false}
        >
          <Text>Modal Content</Text>
        </AccessibleModal>
      );
      expect(getByText('Modal Content')).toBeTruthy();
    });

    it('sets accessibility props correctly for dialog role', () => {
      const { getByLabelText } = render(
        <AccessibleModal
          visible={true}
          onClose={jest.fn()}
          accessibilityLabel="Test Dialog"
          usePortal={false}
        >
          <Text>Content</Text>
        </AccessibleModal>
      );
      const dialog = getByLabelText('Test Dialog');
      expect(dialog.props.accessibilityRole).toBe('dialog');
      expect(dialog.props.accessibilityViewIsModal).toBe(true);
    });
  });

  describe('portal rendering (usePortal=true, default)', () => {
    it('renders children via portal when visible', () => {
      const { getByText } = render(
        <ModalPortalProvider>
          <AccessibleModal visible={true} onClose={jest.fn()} accessibilityLabel="Portal Dialog">
            <Text>Portal Content</Text>
          </AccessibleModal>
        </ModalPortalProvider>
      );
      expect(getByText('Portal Content')).toBeTruthy();
    });

    it('falls back to inline rendering when no provider is present', () => {
      // No ModalPortalProvider — should render inline without throwing
      const { getByText } = render(
        <AccessibleModal visible={true} onClose={jest.fn()} accessibilityLabel="Fallback Dialog">
          <Text>Fallback Content</Text>
        </AccessibleModal>
      );
      expect(getByText('Fallback Content')).toBeTruthy();
    });
  });
});
