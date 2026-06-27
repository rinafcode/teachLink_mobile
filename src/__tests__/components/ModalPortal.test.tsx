import { act, render, renderHook } from '@testing-library/react-native';
import React from 'react';
import { Text } from 'react-native';

import {
  ModalPortalProvider,
  useModalPortal,
  useModalPortalSafe,
} from '../../../src/components/common/ModalPortal';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ModalPortalProvider>{children}</ModalPortalProvider>
);

describe('ModalPortalProvider / useModalPortal', () => {
  it('renders children', () => {
    const { getByText } = render(
      <ModalPortalProvider>
        <Text>App</Text>
      </ModalPortalProvider>
    );
    expect(getByText('App')).toBeTruthy();
  });

  it('showModal registers content and hideModal removes it', () => {
    const { result } = renderHook(() => useModalPortal(), { wrapper });

    act(() => {
      result.current.showModal('test', <Text>Portal Content</Text>);
    });
    expect(result.current.isVisible('test')).toBe(true);

    act(() => {
      result.current.hideModal('test');
    });
    expect(result.current.isVisible('test')).toBe(false);
  });

  it('showModal with same id replaces existing entry', () => {
    const { result } = renderHook(() => useModalPortal(), { wrapper });

    act(() => {
      result.current.showModal('dup', <Text>First</Text>);
      result.current.showModal('dup', <Text>Second</Text>);
    });
    expect(result.current.isVisible('dup')).toBe(true);

    act(() => {
      result.current.hideModal('dup');
    });
    expect(result.current.isVisible('dup')).toBe(false);
  });

  it('useModalPortal throws outside provider', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useModalPortal())).toThrow(
      'useModalPortal must be used within a ModalPortalProvider'
    );
    spy.mockRestore();
  });

  it('useModalPortalSafe returns null outside provider', () => {
    const { result } = renderHook(() => useModalPortalSafe());
    expect(result.current).toBeNull();
  });
});
