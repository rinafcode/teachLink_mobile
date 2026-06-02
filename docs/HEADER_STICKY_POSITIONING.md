# Header Sticky Positioning Implementation

## Overview
This document describes the implementation of native sticky positioning for the MobileHeader component to improve scroll performance and reduce JavaScript computations.

## Implementation Details

### MobileHeader Component Updates
The `MobileHeader` component now supports native sticky positioning through React Native's `position: 'sticky'` style property.

#### New Props
- `sticky?: boolean` - Enable sticky positioning for the header (default: false)
- `stickyTop?: number` - Top offset for sticky positioning (default: 0)

#### Performance Benefits
- ⚡ **Smoother scroll performance**: Native sticky positioning is handled by the native rendering engine, reducing JavaScript overhead
- 📊 **Less JavaScript computation**: No need for manual scroll event listeners and position calculations
- 🎯 **Better user experience**: Headers stay visible during scrolling without janky re-renders

## Usage Examples

### Basic Usage with Sticky Positioning
```tsx
import { MobileHeader } from '@/components';

<ScrollView>
  <MobileHeader 
    title="My Screen" 
    sticky={true} 
    stickyTop={0}
  />
  {/* Scrollable content */}
</ScrollView>
```

### Usage with Safe Area
```tsx
import { MobileHeader } from '@/components';
import { useSafeArea } from '@/hooks';

const MyScreen = () => {
  const { top } = useSafeArea();
  
  return (
    <ScrollView>
      <MobileHeader 
        title="My Screen" 
        sticky={true} 
        stickyTop={top}
      />
      {/* Scrollable content */}
    </ScrollView>
  );
};
```

### Non-Sticky (Default Behavior)
```tsx
import { MobileHeader } from '@/components';

<MobileHeader title="My Screen" />
{/* Header will scroll with content */}
```

## Technical Implementation

### React Native Sticky Positioning
The implementation uses React Native's native `position: 'sticky'` style property:

```typescript
const styles = StyleSheet.create({
  stickyHeader: {
    position: 'sticky' as const,
    zIndex: 1000,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
});
```

### Key Features
- **Native performance**: Leverages the platform's native sticky positioning implementation
- **Shadow/Elevation**: Adds subtle shadow for depth perception when sticky
- **Z-index management**: Ensures header stays above scrollable content
- **Cross-platform**: Works on both iOS and Android

## Migration Guide

### From JavaScript-based Sticky Headers
If you were previously using JavaScript scroll listeners to achieve sticky headers:

**Before (JavaScript-based):**
```tsx
const [headerStyle, setHeaderStyle] = useState({});
const handleScroll = (event) => {
  const offsetY = event.nativeEvent.contentOffset.y;
  setHeaderStyle(offsetY > 50 ? { position: 'absolute', top: 0 } : {});
};

<ScrollView onScroll={handleScroll}>
  <View style={headerStyle}>
    {/* Header content */}
  </View>
</ScrollView>
```

**After (Native sticky positioning):**
```tsx
<ScrollView>
  <MobileHeader sticky={true} stickyTop={0} />
</ScrollView>
```

### Benefits of Migration
- Eliminates scroll event listeners
- Removes re-render cycles during scrolling
- Reduces JavaScript execution overhead
- Improves battery life on mobile devices

## Testing

### Manual Testing Checklist
- [ ] Header stays visible when scrolling down
- [ ] Header returns to normal position when scrolling up
- [ ] Smooth scrolling performance (60fps)
- [ ] No visual flickering or jumping
- [ ] Safe area insets are respected
- [ ] Works correctly on both iOS and Android

### Performance Testing
Test scroll performance using React Native's built-in performance monitoring:
```typescript
// Enable performance overlay in development
if (__DEV__) {
  const { default: DevSettings } = require('react-native/Libraries/Utilities/DevSettings');
  DevSettings.setHotLoadingEnabled(false);
}
```

## Related Issues
- #365 - Implement header/nav performance optimization with sticky positioning
- #35 - Performance optimization
- #36 - Scroll performance improvements
- #43 - Native component utilization

## Future Enhancements
- Consider adding `stickyBackgroundColor` prop for dynamic header styling
- Add animation support for smooth transitions between sticky/non-sticky states
- Implement collapsible header behavior option
