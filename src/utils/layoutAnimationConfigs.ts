

/**
 * Centralized LayoutAnimation configuration presets
 *
 * These configs are optimized for performance and should be used
 * instead of LayoutAnimation.Presets to minimize layout recalculations.
 */

/**
 * Fast animation for minimal UI changes
 * - Duration: 150ms
 * - Animates: update only (no create/delete)
 * - Use case: Quick state toggles, checkbox switches
 */
export const LAYOUT_ANIM_FAST = {
  duration: 150,
  update: { type: 'easeInEaseOut', property: 'opacity' },
};

/**
 * Standard animation for moderate UI changes
 * - Duration: 200ms
 * - Animates: create + update
 * - Use case: Progressive disclosure, expand/collapse sections
 */
export const LAYOUT_ANIM_STANDARD = {
  duration: 200,
  create: { type: 'easeInEaseOut', property: 'opacity' },
  update: { type: 'easeInEaseOut', property: 'opacity' },
};

/**
 * Full animation for significant UI changes
 * - Duration: 250ms
 * - Animates: create + update + delete
 * - Use case: List item additions/removals, modal transitions
 */
export const LAYOUT_ANIM_FULL = {
  duration: 250,
  create: { type: 'easeInEaseOut', property: 'opacity' },
  update: { type: 'easeInEaseOut', property: 'opacity' },
  delete: { type: 'easeInEaseOut', property: 'opacity' },
};

/**
 * No-op config for low-end devices
 * - Duration: 0ms (instant)
 * - Animates: none
 * - Use case: Fallback for devices that can't handle animations
 */
export const LAYOUT_ANIM_NONE = {
  duration: 0,
  create: { type: 'linear' },
  update: { type: 'linear' },
  delete: { type: 'linear' },
};

/**
 * Height-only animation for expand/collapse
 * - Duration: 200ms
 * - Animates: scaleXY property only
 * - Use case: Accordion-style height changes
 */
export const LAYOUT_ANIM_HEIGHT = {
  duration: 200,
  create: { type: 'easeInEaseOut', property: 'scaleXY' },
  update: { type: 'easeInEaseOut', property: 'scaleXY' },
};

/**
 * Opacity-only animation for fade effects
 * - Duration: 150ms
 * - Animates: opacity property only
 * - Use case: Show/hide overlays, tooltips
 */
export const LAYOUT_ANIM_FADE = {
  duration: 150,
  create: { type: 'easeInEaseOut', property: 'opacity' },
  update: { type: 'easeInEaseOut', property: 'opacity' },
};
