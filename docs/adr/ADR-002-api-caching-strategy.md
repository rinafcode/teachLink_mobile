# ADR-002: API Caching Strategy

**Status**: Accepted

**Context**:

Our application needs a robust and efficient way to fetch and cache data from our API. We considered several options, including React Query, SWR, and a custom solution using `fetch` and `AsyncStorage`.

**Decision**:

We have decided to use SWR for our API caching strategy. SWR is a React Hooks library for data fetching that provides a simple and powerful way to manage remote data. It offers features like caching, revalidation, and optimistic UI updates out of the box.

**Consequences**:

- **Positive**:
    - SWR provides a simple and intuitive API that is easy to learn and use.
    - It has a built-in caching mechanism that improves performance and reduces the number of API requests.
    - It supports revalidation on focus, on interval, and on reconnect, which ensures that the data is always up-to-date.
- **Negative**:
    - SWR is not as feature-rich as React Query, so we may need to implement custom solutions for some advanced use cases.
    - It does not have a built-in mutation management system, so we need to handle mutations manually.