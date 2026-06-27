import React, { createContext, useCallback, useContext, useMemo, useRef } from 'react';

interface SwipeableCoordinatorContextType {
  registerRow: (id: string, closeFn: () => void) => void;
  unregisterRow: (id: string) => void;
  onRowSwipeStart: (id: string) => void;
}

const SwipeableCoordinatorContext = createContext<SwipeableCoordinatorContextType | null>(null);

export const SwipeableCoordinatorProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const rowsRef = useRef<Map<string, () => void>>(new Map());
  const activeRowIdRef = useRef<string | null>(null);

  const registerRow = useCallback((id: string, closeFn: () => void) => {
    rowsRef.current.set(id, closeFn);
  }, []);

  const unregisterRow = useCallback((id: string) => {
    rowsRef.current.delete(id);
    if (activeRowIdRef.current === id) {
      activeRowIdRef.current = null;
    }
  }, []);

  const onRowSwipeStart = useCallback((id: string) => {
    if (activeRowIdRef.current && activeRowIdRef.current !== id) {
      const closeFn = rowsRef.current.get(activeRowIdRef.current);
      if (closeFn) {
        closeFn();
      }
    }
    activeRowIdRef.current = id;
  }, []);

  const value = useMemo(
    () => ({ registerRow, unregisterRow, onRowSwipeStart }),
    [registerRow, unregisterRow, onRowSwipeStart]
  );

  return (
    <SwipeableCoordinatorContext.Provider value={value}>
      {children}
    </SwipeableCoordinatorContext.Provider>
  );
};

export const useSwipeableCoordinator = (): SwipeableCoordinatorContextType => {
  const context = useContext(SwipeableCoordinatorContext);
  if (!context) {
    // Fallback gracefully if used outside a provider
    return {
      registerRow: () => {},
      unregisterRow: () => {},
      onRowSwipeStart: () => {},
    };
  }
  return context;
};
