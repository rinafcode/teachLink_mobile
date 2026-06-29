import { useEffect, useState } from 'react';

export interface UseModalStackResult {
  zIndex: number;
  isTop: boolean;
  stackIndex: number;
}

/**
 * ModalStackManager manages the active stack of dialogs/modals.
 * It is responsible for tracking stack order, checking if a modal is on top,
 * and auto-assigning unique, ascending z-indices to prevent layering bugs.
 */
export class ModalStackManager {
  private static instance: ModalStackManager;
  private stack: string[] = [];
  private listeners: Set<() => void> = new Set();
  private baseZIndex: number = 10000;
  private zIndexStep: number = 10;

  private constructor() {}

  public static getInstance(): ModalStackManager {
    if (!ModalStackManager.instance) {
      ModalStackManager.instance = new ModalStackManager();
    }
    return ModalStackManager.instance;
  }

  /**
   * Pushes a modal onto the stack.
   */
  public push(id: string): void {
    const index = this.stack.indexOf(id);
    if (index !== -1) {
      // Remove existing to push it to the top of the stack
      this.stack.splice(index, 1);
    }
    this.stack.push(id);
    this.notify();
  }

  /**
   * Removes a modal from the stack.
   */
  public pop(id: string): void {
    const index = this.stack.indexOf(id);
    if (index !== -1) {
      this.stack.splice(index, 1);
      this.notify();
    }
  }

  /**
   * Gets the z-index for a given modal.
   * If the modal is not in the stack, returns the base z-index.
   */
  public getZIndex(id: string): number {
    const index = this.stack.indexOf(id);
    if (index === -1) {
      return this.baseZIndex;
    }
    return this.baseZIndex + index * this.zIndexStep;
  }

  /**
   * Checks if a given modal is at the top of the stack.
   */
  public isTop(id: string): boolean {
    if (this.stack.length === 0) return false;
    return this.stack[this.stack.length - 1] === id;
  }

  /**
   * Gets the current stack of modal IDs.
   */
  public getStack(): string[] {
    return [...this.stack];
  }

  /**
   * Subscribes to stack changes.
   */
  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    this.listeners.forEach(listener => {
      try {
        listener();
      } catch (e) {
        console.error('Error in ModalStackManager listener:', e);
      }
    });
  }

  /**
   * Clears the stack (primarily for testing purposes).
   */
  public clear(): void {
    this.stack = [];
    this.notify();
  }
}

export const modalStackManager = ModalStackManager.getInstance();

/**
 * Hook to manage modal stacking. Registers the modal in the stack when visible
 * and provides the auto-assigned zIndex and active top status.
 *
 * @param id Unique identifier for the modal
 * @param visible Whether the modal is currently visible
 */
export function useModalStack(id: string, visible: boolean): UseModalStackResult {
  const [state, setState] = useState<UseModalStackResult>(() => ({
    zIndex: modalStackManager.getZIndex(id),
    isTop: modalStackManager.isTop(id),
    stackIndex: modalStackManager.getStack().indexOf(id),
  }));

  useEffect(() => {
    if (visible) {
      modalStackManager.push(id);
    } else {
      modalStackManager.pop(id);
    }

    return () => {
      modalStackManager.pop(id);
    };
  }, [id, visible]);

  useEffect(() => {
    if (!visible) {
      setState({
        zIndex: modalStackManager.getZIndex(id),
        isTop: false,
        stackIndex: -1,
      });
      return;
    }

    const unsubscribe = modalStackManager.subscribe(() => {
      setState({
        zIndex: modalStackManager.getZIndex(id),
        isTop: modalStackManager.isTop(id),
        stackIndex: modalStackManager.getStack().indexOf(id),
      });
    });

    setState({
      zIndex: modalStackManager.getZIndex(id),
      isTop: modalStackManager.isTop(id),
      stackIndex: modalStackManager.getStack().indexOf(id),
    });

    return unsubscribe;
  }, [id, visible]);

  return state;
}
