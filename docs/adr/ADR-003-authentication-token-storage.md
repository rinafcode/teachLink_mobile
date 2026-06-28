# ADR-003: Authentication Token Storage

**Status**: Accepted

**Context**:

We need a secure way to store authentication tokens on the user's device. We considered several options, including `expo-secure-store` and `AsyncStorage`.

**Decision**:

We have decided to use `expo-secure-store` for storing authentication tokens. `expo-secure-store` provides a way to encrypt and securely store key-value pairs on the device. It uses the native Keychain services on iOS and the Keystore on Android.

**Consequences**:

- **Positive**:
    - `expo-secure-store` provides a secure way to store sensitive data on the user's device.
    - It is easy to use and has a simple API.
- **Negative**:
    - `expo-secure-store` is only available in Expo projects, so we may need to find an alternative if we eject to a bare React Native project.
    - It has a size limit for the stored data, so we need to be mindful of the amount of data we store.