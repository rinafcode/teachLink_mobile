/**
 * ModalPortal — isolates modal rendering from parent component trees.
 *
 * React Native's Modal already renders at the OS level, but the Modal *component*
 * still lives in the parent's React tree and re-renders whenever the parent does.
 * The portal pattern lifts modal state to a root-level context so the Modal
 * component is owned by ModalPortalHost (mounted once at the root) rather than
 * by the calling component.
 *
 * Usage:
 *   1. Wrap your root layout with <ModalPortalProvider>.
 *   2. Place <ModalPortalHost /> inside the provider (typically at the end of the root layout).
 *   3. Call useModalPortal() in any component to show/hide modals.
 *
 * @example
 * // Root layout
 * <ModalPortalProvider>
 *   <App />
 *   <ModalPortalHost />
 * </ModalPortalProvider>
 *
 * // Any component
 * const { showModal, hideModal } = useModalPortal();
 * showModal('confirm', <ConfirmDialog onClose={() => hideModal('confirm')} />);
 */

import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ModalEntry {
  id: string;
  content: React.ReactNode;
}

interface ModalPortalContextValue {
  /** Register and show a modal by id. Replaces any existing modal with the same id. */
  showModal: (id: string, content: React.ReactNode) => void;
  /** Remove a modal by id. */
  hideModal: (id: string) => void;
  /** Whether a modal with the given id is currently registered. */
  isVisible: (id: string) => boolean;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const ModalPortalContext = createContext<ModalPortalContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

/**
 * Provides modal portal state to the component tree.
 * Mount once at the application root.
 */
export const ModalPortalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [modals, setModals] = useState<ModalEntry[]>([]);

  // Keep a ref so callbacks don't capture stale state
  const modalsRef = useRef(modals);
  modalsRef.current = modals;

  const showModal = useCallback((id: string, content: React.ReactNode) => {
    setModals(prev => {
      const exists = prev.some(m => m.id === id);
      if (exists) {
        return prev.map(m => (m.id === id ? { id, content } : m));
      }
      return [...prev, { id, content }];
    });
  }, []);

  const hideModal = useCallback((id: string) => {
    setModals(prev => prev.filter(m => m.id !== id));
  }, []);

  const isVisible = useCallback((id: string) => modalsRef.current.some(m => m.id === id), []);

  const value = useMemo(
    () => ({ showModal, hideModal, isVisible }),
    [showModal, hideModal, isVisible]
  );

  return (
    <ModalPortalContext.Provider value={value}>
      {children}
      {/* ModalPortalHost is rendered here so it shares the same context */}
      <ModalPortalHost _modals={modals} />
    </ModalPortalContext.Provider>
  );
};

// ─── Host ─────────────────────────────────────────────────────────────────────

/**
 * Renders all portalled modals at the root level.
 * This component is intentionally internal — ModalPortalProvider mounts it automatically.
 * Do NOT mount it manually; use ModalPortalProvider instead.
 */
const ModalPortalHost: React.FC<{ _modals: ModalEntry[] }> = React.memo(function ModalPortalHost({
  _modals,
}) {
  if (_modals.length === 0) return null;
  return (
    <>
      {_modals.map(({ id, content }) => (
        <View key={id} collapsable={false} style={{ position: 'absolute', width: 0, height: 0 }}>
          {content}
        </View>
      ))}
    </>
  );
});

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Returns portal controls for showing and hiding modals.
 * Must be used inside a ModalPortalProvider.
 */
export function useModalPortal(): ModalPortalContextValue {
  const ctx = useContext(ModalPortalContext);
  if (!ctx) {
    throw new Error('useModalPortal must be used within a ModalPortalProvider');
  }
  return ctx;
}

/**
 * Like useModalPortal but returns null instead of throwing when no provider is present.
 * Used internally by AccessibleModal to gracefully fall back to inline rendering.
 */
export function useModalPortalSafe(): ModalPortalContextValue | null {
  return useContext(ModalPortalContext);
}
