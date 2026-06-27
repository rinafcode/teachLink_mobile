import {
    cancelPendingAnimation,
    configureNext,
    configureNextImmediate,
} from './layoutAnimation';
import {
    LAYOUT_ANIM_FAST,
    LAYOUT_ANIM_FULL,
    LAYOUT_ANIM_NONE,
    LAYOUT_ANIM_STANDARD,
} from './layoutAnimationConfigs';

/**
 * Safe LayoutAnimation wrapper for backward compatibility.
 *
 * This module preserves the previous `safeLayoutAnimation` API while
 * delegating all behavior to the centralized `layoutAnimation` utility.
 */

export function safeLayoutAnimation(config?: LayoutAnimation.AnimationConfig): void {
  configureNext(config);
}

export function cancelPendingLayoutAnimation(): void {
  cancelPendingAnimation();
}

export function safeLayoutAnimationImmediate(config?: LayoutAnimation.AnimationConfig): void {
  configureNextImmediate(config);
}

export {
    LAYOUT_ANIM_FAST, LAYOUT_ANIM_FULL,
    LAYOUT_ANIM_NONE, LAYOUT_ANIM_STANDARD
};

