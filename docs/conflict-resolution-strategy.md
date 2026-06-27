# Real-Time Sync Conflict Resolution Strategy

TeachLink uses versioned WebSocket sync envelopes for collaborative data updates.
Each tracked entity carries:

- `version`: the server-authoritative monotonic version.
- `clientSeq`: the number of unacknowledged local edits.
- `checksum`: a stable checksum of the entity payload for quick equality checks.
- `baseEntity`: the last server version the client saw before local edits.

## Conflict Detection

An incoming server update is not a conflict when its payload matches the local
checksum, or when the client has no pending local edits and the server version is
equal or newer.

An incoming server update is a conflict when the local payload differs from the
server payload while the client still has pending local edits.

## Resolution Modes

`server-wins` accepts the server entity and clears `clientSeq`. Use this for
system-owned or read-heavy data such as notifications.

`client-wins` preserves local data, rebases it onto the newest server version,
and clears `clientSeq`. Use this for user-preference fields where preserving the
local device edit is more important than server recency.

`last-write-wins` compares timestamps and picks the newest mutation. It is only
appropriate for fields where wall-clock ordering is acceptable.

`merge` is the default for collaborative entities. When `baseEntity` is present,
the client performs a three-way field merge:

- Fields changed only by the client keep the client value.
- Fields changed only by the server keep the server value.
- Fields changed by both sides resolve to the server value and are recorded in
  `serverOverriddenFields`.
- Nested objects are merged recursively.
- Arrays are treated as whole values to avoid unsafe ordering assumptions.

When `baseEntity` is missing, merge falls back to a conservative server-first
merge. It preserves client-only fields but lets the server win for shared fields.

## WebSocket Envelope

Versioned real-time messages use this shape:

```ts
{
  event: 'sync_entity_updated',
  entity: VersionedEntity,
  baseEntity?: VersionedEntity,
  strategy?: 'server-wins' | 'client-wins' | 'last-write-wins' | 'merge'
}
```

The client stores accepted versions in `versionStore` and keeps a base copy while
local edits are pending. After any successful server update or conflict
resolution, the resolved entity becomes the new base.
