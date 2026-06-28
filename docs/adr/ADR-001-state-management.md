# ADR-001: State Management

**Status**: Accepted

**Context**:

We need a predictable and efficient way to manage the global state in our React Native application. The state includes user authentication, profile information, and other shared data. We considered several options, including Redux, MobX, and Zustand.

**Decision**:

We have decided to use Zustand for state management. Zustand is a small, fast, and scalable state management library for React. It provides a simple and intuitive API that is easy to learn and use.

**Consequences**:

- **Positive**:
    - Zustand is a lightweight library with a small bundle size, which is important for mobile applications.
    - It has a simple and intuitive API that is easy to learn and use.
    - It is highly performant and can handle frequent state updates without performance issues.
- **Negative**:
    - Zustand is less popular than Redux, so there are fewer resources and community support available.
    - It does not have a built-in middleware ecosystem like Redux, so we may need to implement custom solutions for logging, analytics, and other side effects.