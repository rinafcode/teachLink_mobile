# Component Prop Patterns

This document explains the prop-passing conventions used in TeachLink mobile and why they exist.

---

## The Problem with `{...props}` / `{...rest}` Spreading

Spreading all props blindly onto a child element has several downsides:

1. **Unnecessary re-renders** — any prop change in the bag, including ones the component doesn't use, triggers a re-render of the child.
2. **Hidden contracts** — callers can't tell from the interface which props are safe to pass without reading the implementation.
3. **Prop pollution** — non-standard props may silently land on native elements and produce React warnings.

---

## Rule: Always Use Explicit Prop Destructuring in Wrapper Components

### ✅ Do this

```tsx
// Good: explicit contract, predictable rendering
interface MyButtonProps {
  label: string;
  onPress: () => void;
  testID?: string;
  disabled?: boolean;
}

export const MyButton: React.FC<MyButtonProps> = ({
  label,
  onPress,
  testID,
  disabled,
}) => (
  <TouchableOpacity onPress={onPress} testID={testID} disabled={disabled}>
    <Text>{label}</Text>
  </TouchableOpacity>
);
```

### ❌ Don't do this

```tsx
// Bad: opaque contract, unnecessary re-renders
interface MyButtonProps extends TouchableOpacityProps {
  label: string;
}

export const MyButton: React.FC<MyButtonProps> = ({ label, ...rest }) => (
  <TouchableOpacity {...rest}>
    <Text>{label}</Text>
  </TouchableOpacity>
);
```

---

## When Spreading Is Acceptable

There are two legitimate exceptions to the above rule:

### 1. Higher-Order Components (HOC)

A HOC wraps an *unknown* component type and must forward **all** of its props. The spread is unavoidable here because the wrapped component's props are not known at compile time.

```tsx
// AuthGuard.tsx — must forward every prop of the wrapped component
export function withAuthGuard<P extends object>(
  Component: React.ComponentType<P>,
): React.ComponentType<P> {
  return function AuthGuardedComponent(props: P) {
    return (
      <AuthGuard>
        <Component {...props} />
      </AuthGuard>
    );
  };
}
```

Similarly, `LazyScreen.tsx` uses `{...props}` because it wraps a lazily-loaded, unknown component type.

### 2. React Navigation Drawer Internals

`MobileDrawer` must forward the entire `DrawerContentComponentProps` bag to `<DrawerContentScrollView>` and `<DrawerItemList>` because React Navigation requires this exact shape for navigation to function.

### 3. Computed Internal Objects

Spreading a **locally-computed** object (not external props) is fine, because the object's shape is known and controlled:

```tsx
// PullToRefresh.tsx — spreading internal PanResponder handlers
<View {...responderHandlers}>
```

These computed-object spreads are not the same as forwarding unknown external props.

---

## Adding New Props to a Wrapper Component

1. Add the new prop to the component's **explicit interface** with a JSDoc comment.
2. Destructure it from the function parameters.
3. Pass it by name to the underlying element.
4. Do **not** fall back to `...rest` — keep the list explicit.

---

## Files That Were Refactored (Issue #371)

| Component | Change |
|---|---|
| `AppText.tsx` | Replaced `{...props}` with explicit `TextProps` subset |
| `AccessibleButton.tsx` | Replaced `{...rest}` with explicit `TouchableOpacityProps` subset |
| `MobileFormInput.tsx` | Replaced `{...rest}` with explicit `TextInputProps` subset |
| `InfiniteVirtualList.tsx` | Replaced `{...rest}` with explicit `FlatListProps` extension |
| `VirtualList.tsx` | Replaced `{...rest}` with explicit `FlatListProps` extension |

Files where spreading was **intentionally kept** (see exceptions above):

| File | Reason |
|---|---|
| `AuthGuard.tsx` | HOC pattern — must forward all props of wrapped component |
| `LazyScreen.tsx` | Generic lazy-loader HOC — same as above |
| `MobileDrawer.tsx` | React Navigation requires full `DrawerContentComponentProps` forwarding |
| `PullToRefresh.tsx` | Internal computed objects (PanResponder handlers, scroll props) |
| `MobileVideoPlayer.tsx` | Internal computed PanResponder handlers |
| `AchievementBadges.tsx` | Computed accessibility object spread — not external prop forwarding |
