/**
 * Core types for the real-time synchronization and conflict resolution system.
 *
 * Architecture overview:
 * - Every tracked entity carries a VersionedEntity wrapper.
 * - version is a monotonically increasing server-authoritative counter.
 * - clientSeq is a client-local sequence used to detect unacknowledged edits.
 * - baseVersion is the last server copy seen before local edits, enabling
 *   three-way merge for simultaneous edits.
 *
 * See docs/conflict-resolution-strategy.md for the full strategy document.
 */

/**
 * Wraps any data object with versioning metadata needed for conflict detection.
 */
export interface VersionedEntity<T = Record<string, unknown>> {
  /** Stable identifier for the entity, such as course ID or lesson ID. */
  id: string;
  /** Domain type label, such as course, lesson, quiz, message, or note. */
  entityType: string;
  /** The actual data payload. */
  data: T;
  /**
   * Server-authoritative monotonic version counter.
   * Incremented by the server on every accepted write.
   */
  version: number;
  /**
   * Client-local sequence number.
   * Incremented on every local mutation before the server acknowledges it.
   */
  clientSeq: number;
  /** ID of the client that produced this version. */
  clientId: string;
  /** Wall-clock timestamp in ms since epoch of the last mutation. */
  timestamp: number;
  /** Stable checksum of data, used for quick equality checks. */
  checksum: string;
}

/** Represents a detected synchronization conflict between local and server state. */
export interface SyncConflict<T = Record<string, unknown>> {
  entityId: string;
  entityType: string;
  /** Last acknowledged version before local edits. Required for true merge. */
  baseVersion?: VersionedEntity<T>;
  localVersion: VersionedEntity<T>;
  serverVersion: VersionedEntity<T>;
  detectedAt: number;
}

/**
 * Available conflict resolution strategies.
 *
 * - server-wins: always accept the server version.
 * - client-wins: keep local data and rebase it onto the server version.
 * - last-write-wins: compare timestamps; pick the most recent mutation.
 * - merge: three-way field-level merge when baseVersion exists. Server wins
 *   only when both sides changed the same field.
 */
export type ConflictResolutionStrategy =
  | 'server-wins'
  | 'client-wins'
  | 'last-write-wins'
  | 'merge';

/** Outcome of a conflict resolution pass. */
export interface ConflictResolutionResult<T = Record<string, unknown>> {
  /** The winning or merged entity, ready to be committed locally. */
  resolved: VersionedEntity<T>;
  /** Which strategy was actually applied. */
  strategy: ConflictResolutionStrategy;
  /** True when a genuine conflict was detected. */
  hadConflict: boolean;
  /** Fields overridden by the server because both sides modified them. */
  serverOverriddenFields?: string[];
  /** Fields preserved from the client during a merge. */
  clientPreservedFields?: string[];
}

export type SyncEventType =
  | 'syncStarted'
  | 'syncCompleted'
  | 'syncFailed'
  | 'operationProcessed'
  | 'conflictDetected'
  | 'conflictResolved';

export interface SyncEvent<T = Record<string, unknown>> {
  type: SyncEventType;
  operationId?: string;
  conflict?: SyncConflict<T>;
  resolution?: ConflictResolutionResult<T>;
  data?: unknown;
  error?: unknown;
  timestamp: number;
}

/**
 * Envelope used for WebSocket messages that participate in the sync protocol.
 * Both client-to-server and server-to-client messages use this shape.
 */
export interface VersionedSyncMessage<T = Record<string, unknown>> {
  event: string;
  entity: VersionedEntity<T>;
  baseEntity?: VersionedEntity<T>;
  strategy?: ConflictResolutionStrategy;
}
