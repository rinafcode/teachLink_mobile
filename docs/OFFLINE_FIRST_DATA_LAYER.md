# Offline-First Data Layer

The offline-first data layer is centered on `useOfflineData`, `offlineStorage`, and `syncService`.
Every local mutation is written to AsyncStorage before network sync is attempted, so app state
survives process restarts, disabled network, and reconnect retries.

## Mutation Flow

1. `useOfflineData` stores the local record with `status: "pending"` and a version timestamp.
2. The same mutation is added to the persisted sync queue as `CREATE`, `UPDATE`, or `DELETE`.
3. Deletes are stored as tombstones until the server confirms sync, preventing local data loss while offline.
4. When the device is online, `syncService.manualSync()` flushes queued operations.
5. Successful server sync removes the operation from the queue; callers can mark records synced with `markAsSynced`.

The queue is persisted under `@teachlink_sync_queue`, and repeated queued operations for the same
endpoint and operation type are compacted to the latest payload.

## Reconnect Behavior

`useNetworkStatus` reports online and offline transitions. When the app comes back online,
`useOfflineData` runs `syncAll()` once for the current connection and queues every pending or
errored record that has not exceeded its retry budget. Online mutations also trigger an immediate
manual sync when `autoSync` is enabled.

## Conflict Resolution

Conflict metadata is kept on each `OfflineDataItem`:

- `baseData`: the last known synced version.
- `serverData`: the conflicting server payload.
- `conflictResolutionStrategy`: one of `server-wins`, `client-wins`, or `manual`.

Use `markConflict(id, serverData, baseData)` when a sync response reports a conflict. Then call
`resolveConflict` with one of these strategies:

- `server-wins`: replace the local record with the server payload and queue an update.
- `client-wins`: keep the local payload and queue it for upload.
- `manual`: require an explicit resolved payload and queue that value for upload.

Legacy strategy names `serverWins` and `clientWins` are normalized to the hyphenated names.

## Sync Monitoring

`syncService.getSyncStats()` reports pending operations, failed operations, success count,
failure count, conflict count, last sync time, and success rate. `useOfflineData` subscribes to
sync events and exposes those metrics as `syncSuccessRate`, `syncSuccessCount`,
`syncFailureCount`, and `syncConflictCount`.
