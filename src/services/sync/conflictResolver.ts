import { checksum, checksumEqual } from './checksum';
import type {
  ConflictResolutionResult,
  ConflictResolutionStrategy,
  SyncConflict,
  VersionedEntity,
} from './types';

export function createVersionedEntity<T extends Record<string, unknown>>(
  id: string,
  entityType: string,
  data: T,
  clientId: string,
  serverVersion = 0,
): VersionedEntity<T> {
  return {
    id,
    entityType,
    data,
    version: serverVersion,
    clientSeq: 0,
    clientId,
    timestamp: Date.now(),
    checksum: checksum(data),
  };
}

export function applyLocalMutation<T extends Record<string, unknown>>(
  entity: VersionedEntity<T>,
  patch: Partial<T>,
): VersionedEntity<T> {
  const newData = { ...entity.data, ...patch };
  return {
    ...entity,
    data: newData,
    clientSeq: entity.clientSeq + 1,
    timestamp: Date.now(),
    checksum: checksum(newData),
  };
}

export function detectConflict<T extends Record<string, unknown>>(
  local: VersionedEntity<T>,
  server: VersionedEntity<T>,
): boolean {
  if (checksumEqual(local.data, server.data)) return false;
  if (local.clientSeq === 0 && server.version >= local.version) return false;
  return true;
}

export function buildConflict<T extends Record<string, unknown>>(
  local: VersionedEntity<T>,
  server: VersionedEntity<T>,
  base?: VersionedEntity<T>,
): SyncConflict<T> {
  return {
    entityId: local.id,
    entityType: local.entityType,
    baseVersion: base,
    localVersion: local,
    serverVersion: server,
    detectedAt: Date.now(),
  };
}

export function resolveConflict<T extends Record<string, unknown>>(
  conflict: SyncConflict<T>,
  strategy: ConflictResolutionStrategy = 'server-wins',
): ConflictResolutionResult<T> {
  const { localVersion: local, serverVersion: server } = conflict;

  switch (strategy) {
    case 'server-wins':
      return makeResult(acceptServer(server), strategy, true);

    case 'client-wins':
      return makeResult(acceptClient(local, server), strategy, true);

    case 'last-write-wins': {
      const winner =
        local.timestamp >= server.timestamp ? acceptClient(local, server) : acceptServer(server);
      return makeResult(winner, strategy, true);
    }

    case 'merge':
      return mergeConflict(conflict);
  }
}

export function applyServerUpdate<T extends Record<string, unknown>>(
  _local: VersionedEntity<T> | undefined,
  server: VersionedEntity<T>,
): ConflictResolutionResult<T> {
  return makeResult(acceptServer(server), 'server-wins', false);
}

export function processServerUpdate<T extends Record<string, unknown>>(
  local: VersionedEntity<T> | undefined,
  server: VersionedEntity<T>,
  strategy: ConflictResolutionStrategy = 'merge',
  base?: VersionedEntity<T>,
): ConflictResolutionResult<T> {
  if (!local || !detectConflict(local, server)) {
    return applyServerUpdate(local, server);
  }

  return resolveConflict(buildConflict(local, server, base), strategy);
}

function acceptServer<T extends Record<string, unknown>>(
  server: VersionedEntity<T>,
): VersionedEntity<T> {
  return { ...server, clientSeq: 0, checksum: checksum(server.data) };
}

function acceptClient<T extends Record<string, unknown>>(
  local: VersionedEntity<T>,
  server: VersionedEntity<T>,
): VersionedEntity<T> {
  return {
    ...local,
    version: Math.max(local.version, server.version),
    clientSeq: 0,
    timestamp: Date.now(),
    checksum: checksum(local.data),
  };
}

function mergeConflict<T extends Record<string, unknown>>(
  conflict: SyncConflict<T>,
): ConflictResolutionResult<T> {
  const { localVersion: local, serverVersion: server, baseVersion: base } = conflict;

  if (!base) {
    const fallback = mergeWithoutBase(local.data, server.data) as T;
    const resolved = buildMergedEntity(server, fallback);
    return {
      resolved,
      strategy: 'merge',
      hadConflict: true,
      serverOverriddenFields: findDifferingFields(local.data, server.data),
      clientPreservedFields: [],
    };
  }

  const serverOverriddenFields: string[] = [];
  const clientPreservedFields: string[] = [];
  const mergedData = threeWayMerge(
    base.data,
    local.data,
    server.data,
    serverOverriddenFields,
    clientPreservedFields,
    '',
  ) as T;

  return {
    resolved: buildMergedEntity(server, mergedData),
    strategy: 'merge',
    hadConflict: true,
    serverOverriddenFields,
    clientPreservedFields,
  };
}

function buildMergedEntity<T extends Record<string, unknown>>(
  server: VersionedEntity<T>,
  data: T,
): VersionedEntity<T> {
  return {
    ...server,
    data,
    clientSeq: 0,
    timestamp: Date.now(),
    checksum: checksum(data),
  };
}

function threeWayMerge(
  base: Record<string, unknown>,
  local: Record<string, unknown>,
  server: Record<string, unknown>,
  serverOverridden: string[],
  clientPreserved: string[],
  prefix: string,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const keys = new Set([...Object.keys(base), ...Object.keys(local), ...Object.keys(server)]);

  for (const key of keys) {
    const path = prefix ? `${prefix}.${key}` : key;
    const baseValue = base[key];
    const localHas = hasOwn(local, key);
    const serverHas = hasOwn(server, key);
    const localValue = local[key];
    const serverValue = server[key];

    const localChanged = !checksumEqual(baseValue, localValue) || (!hasOwn(base, key) && localHas);
    const serverChanged = !checksumEqual(baseValue, serverValue) || (!hasOwn(base, key) && serverHas);

    if (!localHas && !serverHas) continue;

    if (isPlainObject(baseValue) && isPlainObject(localValue) && isPlainObject(serverValue)) {
      result[key] = threeWayMerge(
        baseValue,
        localValue,
        serverValue,
        serverOverridden,
        clientPreserved,
        path,
      );
      continue;
    }

    if (localChanged && !serverChanged) {
      if (localHas) result[key] = localValue;
      clientPreserved.push(path);
      continue;
    }

    if (!localChanged && serverChanged) {
      if (serverHas) result[key] = serverValue;
      continue;
    }

    if (localChanged && serverChanged && !checksumEqual(localValue, serverValue)) {
      if (serverHas) result[key] = serverValue;
      serverOverridden.push(path);
      continue;
    }

    if (serverHas) result[key] = serverValue;
    else if (localHas) result[key] = localValue;
  }

  return result;
}

function mergeWithoutBase(
  local: Record<string, unknown>,
  server: Record<string, unknown>,
): Record<string, unknown> {
  const result: Record<string, unknown> = { ...server };

  for (const key of Object.keys(local)) {
    if (!hasOwn(server, key)) {
      result[key] = local[key];
    } else if (isPlainObject(local[key]) && isPlainObject(server[key])) {
      result[key] = mergeWithoutBase(
        local[key] as Record<string, unknown>,
        server[key] as Record<string, unknown>,
      );
    }
  }

  return result;
}

function findDifferingFields(
  local: Record<string, unknown>,
  server: Record<string, unknown>,
  prefix = '',
): string[] {
  const fields: string[] = [];
  const keys = new Set([...Object.keys(local), ...Object.keys(server)]);

  for (const key of keys) {
    const path = prefix ? `${prefix}.${key}` : key;
    const localValue = local[key];
    const serverValue = server[key];
    if (isPlainObject(localValue) && isPlainObject(serverValue)) {
      fields.push(...findDifferingFields(localValue, serverValue, path));
    } else if (!checksumEqual(localValue, serverValue)) {
      fields.push(path);
    }
  }

  return fields;
}

function hasOwn(value: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function makeResult<T extends Record<string, unknown>>(
  resolved: VersionedEntity<T>,
  strategy: ConflictResolutionStrategy,
  hadConflict: boolean,
): ConflictResolutionResult<T> {
  return { resolved, strategy, hadConflict };
}
