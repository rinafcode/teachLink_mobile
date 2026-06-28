# ADR-004: Streaming Protocol

**Status**: Accepted

**Context**:

We need a way to stream data from our server to the client in real-time. We considered several options, including NDJSON, WebSocket, and Server-Sent Events (SSE).

**Decision**:

We have decided to use NDJSON (Newline Delimited JSON) for our streaming protocol. NDJSON is a simple and efficient way to stream JSON objects over a network connection. It is easy to parse and can be used with any HTTP library.

**Consequences**:

- **Positive**:
    - NDJSON is a simple and lightweight protocol that is easy to implement and debug.
    - It is supported by most HTTP libraries and can be used with any backend language.
    - It is more resilient to network interruptions than WebSockets, as each JSON object is a separate message.
- **Negative**:
    - NDJSON does not provide a way to send messages from the client to the server, so we need to use a separate HTTP request for that.
    - It does not have a built-in mechanism for handling backpressure, so we need to implement it ourselves.