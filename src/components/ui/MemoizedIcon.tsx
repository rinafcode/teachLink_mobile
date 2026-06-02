/**
 * Memoized Icon Components
 *
 * #361: Efficient SVG rendering with memoization
 * Wraps lucide-react-native icons and custom icon components with React.memo
 * to prevent unnecessary re-renders when parent components update.
 */

import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react-native';
import React from 'react';

/**
 * Props type for icon components
 */
export interface IconProps {
  size?: number;
  color?: string;
  strokeWidth?: number;
}

/**
 * Memoized sort direction icon
 * Renders ArrowUp, ArrowDown, or ArrowUpDown based on direction
 */
export interface SortIconProps {
  direction: 'asc' | 'desc' | null;
  size?: number;
}

const SortIconComponent = ({ direction, size = 13 }: SortIconProps) => {
  const color = direction ? '#19c3e6' : '#D1D5DB';

  if (direction === 'asc') return <ArrowUp size={size} color={color} />;
  if (direction === 'desc') return <ArrowDown size={size} color={color} />;
  return <ArrowUpDown size={size} color={color} />;
};

/**
 * Memoized SortIcon with prop comparison
 * Only re-renders if direction or size props change
 */
export const MemoizedSortIcon = React.memo(SortIconComponent, (prevProps, nextProps) => {
  return prevProps.direction === nextProps.direction && prevProps.size === nextProps.size;
});

MemoizedSortIcon.displayName = 'MemoizedSortIcon';

/**
 * Generic icon wrapper factory
 * Creates a memoized icon component from a lucide-react-native icon
 *
 * Usage:
 * const MemoizedDownloadIcon = createMemoizedIcon(Download);
 */
export function createMemoizedIcon<P extends IconProps>(
  IconComponent: React.ComponentType<P>,
  displayName: string
) {
  const Memoized = React.memo(IconComponent, (prevProps, nextProps) => {
    // Custom comparison: re-render only if size or color changes
    return prevProps.size === nextProps.size && prevProps.color === nextProps.color;
  });

  Memoized.displayName = displayName;
  return Memoized;
}
