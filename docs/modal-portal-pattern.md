# Modal Portal Pattern

## Problem

React Native's `Modal` renders at the OS level, but the `Modal` _component_ still lives inside the parent's React tree. When a parent component re-renders (e.g. during a scroll event or state update), the `Modal` component re-renders too — even if the modal's own props haven't changed. This causes jank during scroll+modal interactions and degrades performance on low-end devices.

## Solution

The portal pattern lifts modal state to a root-level context (`ModalPortalProvider`). The `Modal` component is owned by `ModalPortalHost` — mounted once at the root — rather than by the calling component. The calling component only registers/unregisters content; it never owns the `Modal` node.

```
Before:  ParentList → re-renders → ModalComponent → re-renders Modal
After:   ParentList → re-renders → (nothing)
         ModalPortalHost → owns Modal, only re-renders when modal state changes
```

## Architecture

```
ModalPortalProvider          (root, holds modal registry state)
  ├── <App />                (your component tree — re-renders freely)
  └── ModalPortalHost        (internal, renders all registered modals)
        ├── Modal id="a"
        └── Modal id="b"
```

### Files

| File                                        | Role                                                   |
| ------------------------------------------- | ------------------------------------------------------ |
| `src/components/common/ModalPortal.tsx`     | Provider, host, `useModalPortal`, `useModalPortalSafe` |
| `src/components/common/AccessibleModal.tsx` | Updated to use portal by default (`usePortal=true`)    |
| `app/_layout.tsx`                           | Mounts `ModalPortalProvider` at the root               |

## Usage

### AccessibleModal (recommended for most cases)

`AccessibleModal` uses the portal automatically. No changes needed at call sites:

```tsx
<AccessibleModal
  visible={isOpen}
  onClose={() => setIsOpen(false)}
  accessibilityLabel="Confirm action"
>
  <ConfirmContent />
</AccessibleModal>
```

Pass `usePortal={false}` to opt out (e.g. in tests or Storybook without a provider):

```tsx
<AccessibleModal visible={true} onClose={fn} accessibilityLabel="..." usePortal={false}>
  ...
</AccessibleModal>
```

### useModalPortal (for custom modals)

Use `useModalPortal` to register any React content as a portal modal:

```tsx
import { useModalPortal } from '@/hooks';

function MyComponent() {
  const { showModal, hideModal } = useModalPortal();

  const open = () =>
    showModal(
      'my-modal',
      <Modal visible transparent onRequestClose={() => hideModal('my-modal')}>
        <MyModalContent onClose={() => hideModal('my-modal')} />
      </Modal>
    );

  return <Button onPress={open} title="Open" />;
}
```

`showModal(id, content)` — registers content under `id`. Calling again with the same `id` replaces the content.  
`hideModal(id)` — removes the modal.  
`isVisible(id)` — returns whether a modal with that id is registered.

## Graceful fallback

`AccessibleModal` uses `useModalPortalSafe` internally, which returns `null` instead of throwing when no provider is present. In that case it falls back to inline rendering. This means existing components work correctly in tests and Storybook without a provider.

## Components using this pattern

| Component            | How                                                         |
| -------------------- | ----------------------------------------------------------- |
| `AccessibleModal`    | Portal by default (`usePortal=true`)                        |
| `AchievementBadges`  | Via `AccessibleModal`                                       |
| `MobileCourseViewer` | Via `AccessibleModal`                                       |
| `FilterSheet`        | Uses RN `Modal` directly (self-contained, no portal needed) |
| `BiometricPrompt`    | Uses RN `Modal` directly (self-contained, no portal needed) |
| `NotificationPrompt` | Uses RN `Modal` directly (self-contained, no portal needed) |
| `SettingsPicker`     | Uses RN `Modal` directly (self-contained, no portal needed) |

`FilterSheet`, `BiometricPrompt`, `NotificationPrompt`, and `SettingsPicker` manage their own `visible` state internally and are not typically rendered inside high-frequency re-render trees, so they don't need portal wrapping. Migrate them if profiling shows they are affected.

## Testing

```bash
npx jest src/__tests__/components/ModalPortal.test.tsx tests/components/AccessibleModal.test.tsx
```

Tests cover:

- Provider renders children
- `showModal` / `hideModal` / `isVisible` lifecycle
- Duplicate id replacement
- `useModalPortal` throws outside provider
- `useModalPortalSafe` returns null outside provider
- `AccessibleModal` portal and inline rendering paths
- Graceful fallback when no provider is present
