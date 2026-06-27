# Focus Management and Accessibility Patterns

Proper focus management is essential to deliver a highly accessible experience (conforming to WCAG AA guidelines) and prevent rendering/accessibility trees from displaying or reading out-of-order content.

This document outlines the focus management hooks, the reusable `AccessibleModal` component, and general focus patterns implemented in TeachLink Mobile.

---

## Why Focus Management Matters

- **Keyboard Users (Web/Desktop/TV)**: Users navigating with a keyboard rely on the `Tab` and `Shift + Tab` keys to traverse the application. Without a focus trap, focus can leak outside of modal overlays and into elements underneath.
- **Screen Reader Users (VoiceOver/TalkBack)**: Users navigating with screen readers must have their focus programmatically shifted into modal structures upon activation, and their boundaries trapped within the modal card.
- **Context Preservation**: When dismissing a modal or drawer, focus must return to the element (e.g., button, card) that triggered it, so keyboard/screen reader users do not lose their current location in the application.

---

## Focus Management Hooks

### 1. `useFocusRestore`

The `useFocusRestore` hook captures the currently focused element when a modal or interactive component becomes active, and automatically restores focus to that element when the component is deactivated or unmounted.

#### Signature

```typescript
export const useFocusRestore = (
  active: boolean,
  triggerRef?: React.RefObject<any>
) => void;
```

#### Usage Example

```typescript
import { useFocusRestore } from '../hooks/useFocusRestore';

const MyModal = ({ visible, triggerRef }) => {
  // Capture activeElement on mount/activation, restore focus on close/unmount
  useFocusRestore(visible, triggerRef);

  return (
    <Modal visible={visible}>
      {/* Modal Contents */}
    </Modal>
  );
};
```

### 2. `useFocusTrap`

The `useFocusTrap` hook traps focus inside a container element, ensuring keyboard focus (`Tab` navigation) wraps around and screen readers are confined to the modal boundaries.

It returns two sets of properties:

- `containerProps`: To be spread onto the modal wrapper.
- `backgroundProps`: To be spread onto the screen elements outside the modal to hide them from the accessibility tree.

#### Signature

```typescript
export const useFocusTrap = (
  containerRef: React.RefObject<any>,
  active: boolean,
  options?: {
    initialFocusRef?: React.RefObject<any>;
    autoFocus?: boolean;
  }
) => {
  containerProps: object;
  backgroundProps: object;
};
```

#### Usage Example

```typescript
import { useRef } from 'react';
import { View } from 'react-native';
import { useFocusTrap } from '../hooks/useFocusTrap';

const CustomOverlay = ({ visible }) => {
  const containerRef = useRef<View>(null);
  const { containerProps } = useFocusTrap(containerRef, visible, { autoFocus: true });

  return (
    <View
      ref={containerRef}
      accessibilityRole="dialog"
      {...containerProps}
    >
      {/* Dialog content */}
    </View>
  );
};
```

---

## Reusable Components

### `AccessibleModal`

A drop-in replacement for React Native's standard `Modal` that handles overlay dismissal, focus trapping, and focus restoration automatically.

#### Props

| Prop                 | Type                   | Description                                                  |
| -------------------- | ---------------------- | ------------------------------------------------------------ |
| `visible`            | `boolean`              | Controls visibility.                                         |
| `onClose`            | `() => void`           | Invoked on backdrop press or hardware back/close request.    |
| `accessibilityLabel` | `string`               | Spoken label for screen readers.                             |
| `triggerRef`         | `React.RefObject`      | Optional ref of trigger element to restore focus to.         |
| `initialFocusRef`    | `React.RefObject`      | Optional ref of element inside the modal to focus initially. |
| `overlayStyle`       | `StyleProp<ViewStyle>` | Style for the backdrop.                                      |
| `containerStyle`     | `StyleProp<ViewStyle>` | Style for the modal card.                                    |

#### Usage Example

```typescript
import { AccessibleModal } from '../components/common/AccessibleModal';

const App = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const triggerButtonRef = useRef(null);

  return (
    <View>
      <TouchableOpacity
        ref={triggerButtonRef}
        onPress={() => setModalOpen(true)}
      >
        <Text>Open Settings</Text>
      </TouchableOpacity>

      <AccessibleModal
        visible={modalOpen}
        onClose={() => setModalOpen(false)}
        accessibilityLabel="App Settings"
        triggerRef={triggerButtonRef}
      >
        <Text>Settings Details</Text>
        <TouchableOpacity onPress={() => setModalOpen(false)}>
          <Text>Close</Text>
        </TouchableOpacity>
      </AccessibleModal>
    </View>
  );
};
```

---

## Testing & Verifying Focus Patterns

1. **Unit Testing**:
   Ensure focus hooks propagate the correct accessibility props (`accessibilityViewIsModal`, `aria-modal="true"`, etc.) and that focus restore triggers the target's `.focus()` function.
   See [useFocus.test.tsx](file:///C:/Users/fuhad/teachLink_mobile/tests/hooks/useFocus.test.tsx).

2. **Keyboard Navigation Verification (Web)**:
   - Run the app on React Native Web.
   - Open a modal.
   - Press `Tab` repeatedly. Focus should wrap between elements _inside_ the modal and never leak to the background.
   - Press `Shift + Tab`. Focus should cycle backwards within the modal.

3. **Screen Reader Verification (Mobile)**:
   - Enable VoiceOver (iOS) or TalkBack (Android).
   - Open the modal. Ensure focus starts immediately inside the dialog.
   - Swipe to navigate. The screen reader should only swipe through the modal's contents and not read elements behind the modal sheet.
