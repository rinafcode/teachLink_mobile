import { ImpactFeedbackStyle, impactAsync } from 'expo-haptics';

type HapticType = 'light' | 'medium' | 'heavy';

const impactMap = {
  light: ImpactFeedbackStyle.Light,
  medium: ImpactFeedbackStyle.Medium,
  heavy: ImpactFeedbackStyle.Heavy,
};

const intensityWeights = {
  light: 1,
  medium: 2,
  heavy: 3,
};

let pendingHaptic: HapticType | null = null;
let hapticTimeout: ReturnType<typeof setTimeout> | null = null;
const BATCH_WINDOW_MS = 50;

const flushHaptics = () => {
  if (pendingHaptic) {
    impactAsync(impactMap[pendingHaptic]).catch(() => {
      // Ignore haptic failures silently
    });
    pendingHaptic = null;
  }
  hapticTimeout = null;
};

export const useHapticFeedback = (intensity: HapticType = 'medium') => {
  if (!pendingHaptic || intensityWeights[intensity] > intensityWeights[pendingHaptic]) {
    pendingHaptic = intensity;
  }

  if (!hapticTimeout) {
    hapticTimeout = setTimeout(flushHaptics, BATCH_WINDOW_MS);
  }

  // Return a resolved promise to maintain backward compatibility
  return Promise.resolve();
};

/**
 * Use Cases:
 *
 * 1. Button Press (Light)
 * ```tsx
 * const handleButtonPress = () => {
 *   useHapticFeedback('light');
 *   // Button logic
 * };
 *
 * <Pressable onPress={handleButtonPress}>
 *   <Text>Button</Text>
 * </Pressable>
 * ```
 *
 * 2. Form Submit (Medium - default)
 * ```tsx
 * const handleFormSubmit = () => {
 *   useHapticFeedback(); // defaults to 'medium'
 *   // Form submission logic
 * };
 *
 * <TouchableOpacity onPress={handleFormSubmit}>
 *   <Text>Submit</Text>
 * </TouchableOpacity>
 * ```
 *
 * 3. Inline Usage
 * ```tsx
 * <TouchableOpacity onPress={() => useHapticFeedback('light')}>
 *   <Text>Tap Me</Text>
 * </TouchableOpacity>
 * ```
 *
 * 4. Error/Alert (Heavy)
 * ```tsx
 * const handleError = () => {
 *   useHapticFeedback('heavy');
 *   Alert.alert('Error', 'Something went wrong');
 * };
 * ```
 *
 * 5. Toggle/Switch
 * ```tsx
 * const handleToggle = () => {
 *   useHapticFeedback('light');
 *   setToggle(!toggle);
 * };
 *
 * <Switch value={toggle} onValueChange={handleToggle} />
 * ```
 *
 * 6. List Item Selection
 * ```tsx
 * const handleItemPress = (itemId: string) => {
 *   useHapticFeedback('medium');
 *   navigation.navigate('Details', { id: itemId });
 * };
 *
 * <FlatList
 *   data={items}
 *   renderItem={({ item }) => (
 *     <TouchableOpacity onPress={() => handleItemPress(item.id)}>
 *       <Text>{item.name}</Text>
 *     </TouchableOpacity>
 *   )}
 * />
 * ```
 */
