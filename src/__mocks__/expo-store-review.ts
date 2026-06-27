/**
 * Mock for expo-store-review
 * Used in tests to avoid requiring the actual native module
 */

export const isAvailableAsync = jest.fn(async () => true);

export const requestReview = jest.fn(async () => {
  // Mock successful review request
  return;
});

export const hasAction = jest.fn(async () => true);

export const storeUrl = jest.fn(async () => 'https://apps.apple.com/app/teachlink/id1234567890');

export default {
  isAvailableAsync,
  requestReview,
  hasAction,
  storeUrl,
};
