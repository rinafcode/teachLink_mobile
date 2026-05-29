import { useEffect, useId, useState } from 'react';

type Listener = () => void;
let modalStack: string[] = [];
const listeners: Set<Listener> = new Set();

const notifyListeners = () => {
  listeners.forEach(listener => listener());
};

const pushModal = (id: string) => {
  if (!modalStack.includes(id)) {
    modalStack = [...modalStack, id];
    notifyListeners();
  }
};

const popModal = (id: string) => {
  if (modalStack.includes(id)) {
    modalStack = modalStack.filter(modalId => modalId !== id);
    notifyListeners();
  }
};

const getZIndex = (id: string) => {
  const index = modalStack.indexOf(id);
  if (index === -1) return -1;
  return 1000 + (index * 10);
};

/**
 * Hook to manage modal stacking order and automatically assign z-indexes.
 * When multiple modals are open, the most recently opened one gets the highest z-index.
 *
 * @param isVisible Whether the modal is currently visible
 * @param customId Optional custom ID for the modal. A generated one is used if not provided.
 * @returns Object containing the calculated zIndex and a boolean indicating if this is the top-most modal.
 */
export function useModalStack(isVisible: boolean, customId?: string) {
  const generatedId = useId();
  const id = customId || generatedId;
  const [zIndex, setZIndex] = useState(() => getZIndex(id));

  useEffect(() => {
    const handleUpdate = () => {
      setZIndex(getZIndex(id));
    };
    listeners.add(handleUpdate);
    return () => {
      listeners.delete(handleUpdate);
    };
  }, [id]);

  useEffect(() => {
    if (isVisible) {
      pushModal(id);
    } else {
      popModal(id);
    }
    return () => {
      popModal(id);
    };
  }, [id, isVisible]);

  return {
    zIndex: zIndex > -1 ? zIndex : 1000,
    isTopModal: modalStack[modalStack.length - 1] === id,
  };
}
