# ADR-005: Logging Infrastructure

**Status**: Accepted

**Context**:

We need a centralized and effective way to log events and errors in our application. We considered several options, including using `console.log` and a centralized `AppLogger` module.

**Decision**:

We have decided to implement a centralized `AppLogger` module for our logging infrastructure. The `AppLogger` module will provide a consistent way to log events and errors, and it will be easy to integrate with third-party logging services in the future.

**Consequences**:

- **Positive**:
    - The `AppLogger` module will provide a centralized and consistent way to log events and errors.
    - It will be easy to integrate with third-party logging services like Sentry or Bugsnag.
    - It will allow us to easily filter and search for logs based on their level and context.
- **Negative**:
    - We will need to implement the `AppLogger` module ourselves, which will require some initial effort.
    - We will need to ensure that all developers use the `AppLogger` module for logging, which may require some training and enforcement.