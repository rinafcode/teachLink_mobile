import { useCallback, useReducer } from 'react';

/**
 * States for a sheet/modal animation lifecycle.
 *
 *   CLOSED ──open──► OPENING ──done──► OPEN
 *   OPEN   ──close─► CLOSING ──done──► CLOSED
 *
 * Illegal transitions are silently ignored, preventing race conditions when
 * open/close are called while an animation is already in flight.
 */
export type AnimationState = 'CLOSED' | 'OPENING' | 'OPEN' | 'CLOSING';

type Action = 'OPEN' | 'CLOSE' | 'ANIMATION_DONE';

const TRANSITIONS: Record<AnimationState, Partial<Record<Action, AnimationState>>> = {
  CLOSED:  { OPEN: 'OPENING' },
  OPENING: { ANIMATION_DONE: 'OPEN', CLOSE: 'CLOSING' },
  OPEN:    { CLOSE: 'CLOSING' },
  CLOSING: { ANIMATION_DONE: 'CLOSED', OPEN: 'OPENING' },
};

function reducer(state: AnimationState, action: Action): AnimationState {
  return TRANSITIONS[state][action] ?? state;
}

export interface UseAnimationStateMachineReturn {
  animState: AnimationState;
  /** Trigger the open animation (ignored if already open/opening) */
  send: (action: Action) => void;
  isVisible: boolean;
}

/**
 * Hook that manages animation lifecycle via an explicit state machine.
 * Prevents race conditions by only allowing valid state transitions.
 *
 * @param initial - Starting state (default: 'CLOSED')
 *
 * @example
 * const { animState, send, isVisible } = useAnimationStateMachine();
 * // Start open animation:  send('OPEN')
 * // Signal done:           send('ANIMATION_DONE')
 * // Start close animation: send('CLOSE')
 */
export function useAnimationStateMachine(
  initial: AnimationState = 'CLOSED'
): UseAnimationStateMachineReturn {
  const [animState, dispatch] = useReducer(reducer, initial);

  const send = useCallback((action: Action) => dispatch(action), []);

  // Component should be mounted whenever not fully CLOSED
  const isVisible = animState !== 'CLOSED';

  return { animState, send, isVisible };
}
