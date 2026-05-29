import { Platform } from 'react-native';

import { ColumnDef, ExportFormat, GridRow } from '../utils/gridUtils';

/**
 * Represents the current progress of a batch data operation.
 * Can be used to drive a progress bar UI.
 */
export interface BatchProgress {
  /** Number of rows or items processed so far. */
  processed: number;
  /** Total number of rows or items expected. */
  total: number;
  /** Percentage complete (0-100). */
  percent: number;
  /** The current phase of the batch operation. */
  phase: 'queued' | 'processing' | 'complete';
}

/**
 * Options for configuring a batch export operation.
 */
export interface BatchExportOptions<T extends GridRow> {
  /** The data rows to export. */
  rows: T[];
  /** Column definitions used to serialize the rows. */
  columns: ColumnDef<T>[];
  /** Output format (e.g., 'csv', 'json'). */
  format: ExportFormat;
  /** Size of each processing chunk. Default is 500. */
  chunkSize?: number;
  /** Callback to report progress of the operation. */
  onProgress?: (progress: BatchProgress) => void;
  /** If true, attempts to run the operation in a Web Worker (web only) to completely offload the main thread. */
  useWorker?: boolean;
}

/**
 * Options for configuring a batch import operation.
 */
export interface BatchImportOptions {
  /** The raw CSV string to parse and import. */
  csv: string;
  /** Size of each processing chunk. Default is 500. */
  chunkSize?: number;
  /** Callback to report progress of the operation. */
  onProgress?: (progress: BatchProgress) => void;
  /** If true, attempts to run the operation in a Web Worker (web only) to completely offload the main thread. */
  useWorker?: boolean;
}

type WorkerRequest =
  | {
      id: string;
      operation: 'export';
      rows: GridRow[];
      columns: ColumnDef[];
      format: ExportFormat;
      chunkSize: number;
    }
  | {
      id: string;
      operation: 'import';
      csv: string;
      chunkSize: number;
    };

type WorkerResponse =
  | { id: string; type: 'progress'; progress: BatchProgress }
  | { id: string; type: 'complete'; result: string | GridRow[] }
  | { id: string; type: 'error'; error: string };

const DEFAULT_CHUNK_SIZE = 500;

function reportProgress(
  onProgress: ((progress: BatchProgress) => void) | undefined,
  processed: number,
  total: number,
  phase: BatchProgress['phase'] = 'processing'
) {
  onProgress?.({
    processed,
    total,
    percent: total === 0 ? 100 : Math.round((processed / total) * 100),
    phase,
  });
}

/**
 * Yields execution back to the main thread to prevent UI freezing during large data operations.
 * On Web, setTimeout(..., 0) effectively yields.
 * On React Native (iOS/Android), setTimeout is not always sufficient for smooth UI,
 * so we use requestAnimationFrame to allow native rendering frames to pass.
 */
function waitForNextBatch(): Promise<void> {
  return new Promise(resolve => {
    if (Platform.OS === 'web') {
      setTimeout(resolve, 0);
    } else {
      requestAnimationFrame(() => resolve());
    }
  });
}

function escapeCsvCell(value: unknown): string {
  const str = value == null ? '' : String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function serializeChunkToCSV<T extends GridRow>(rows: T[], columns: ColumnDef<T>[]): string[] {
  return rows.map(row => columns.map(column => escapeCsvCell(row[column.key])).join(','));
}

function serializeChunkToJSON<T extends GridRow>(rows: T[], columns: ColumnDef<T>[]) {
  return rows.map(row => {
    const entry: Record<string, unknown> = {};
    columns.forEach(column => {
      entry[column.key] = row[column.key] ?? null;
    });
    return entry;
  });
}

function parseCSVLine(line: string): string[] {
  const cells: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === '"' && inQuotes && next === '"') {
      current += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === ',' && !inQuotes) {
      cells.push(current);
      current = '';
      continue;
    }

    current += char;
  }

  cells.push(current);
  return cells;
}

function splitCSVRows(csv: string): string[] {
  const rows: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let index = 0; index < csv.length; index += 1) {
    const char = csv[index];
    const next = csv[index + 1];

    if (char === '"' && inQuotes && next === '"') {
      current += char + next;
      index += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') {
        index += 1;
      }
      rows.push(current);
      current = '';
      continue;
    }

    current += char;
  }

  if (current.length > 0) {
    rows.push(current);
  }

  return rows.filter(row => row.trim().length > 0);
}

async function exportInChunks<T extends GridRow>({
  rows,
  columns,
  format,
  chunkSize = DEFAULT_CHUNK_SIZE,
  onProgress,
}: BatchExportOptions<T>): Promise<string> {
  reportProgress(onProgress, 0, rows.length, 'queued');

  if (format === 'csv') {
    const lines = [columns.map(column => escapeCsvCell(column.title)).join(',')];

    for (let start = 0; start < rows.length; start += chunkSize) {
      const chunk = rows.slice(start, start + chunkSize);
      lines.push(...serializeChunkToCSV(chunk, columns));
      reportProgress(onProgress, Math.min(start + chunk.length, rows.length), rows.length);
      await waitForNextBatch();
    }

    reportProgress(onProgress, rows.length, rows.length, 'complete');
    return lines.join('\n');
  }

  const records: Record<string, unknown>[] = [];
  for (let start = 0; start < rows.length; start += chunkSize) {
    const chunk = rows.slice(start, start + chunkSize);
    records.push(...serializeChunkToJSON(chunk, columns));
    reportProgress(onProgress, Math.min(start + chunk.length, rows.length), rows.length);
    await waitForNextBatch();
  }

  reportProgress(onProgress, rows.length, rows.length, 'complete');
  return JSON.stringify(records, null, 2);
}

async function importCSVInChunks({
  csv,
  chunkSize = DEFAULT_CHUNK_SIZE,
  onProgress,
}: BatchImportOptions): Promise<GridRow[]> {
  const lines = splitCSVRows(csv);
  if (lines.length === 0) {
    reportProgress(onProgress, 0, 0, 'complete');
    return [];
  }

  const headers = parseCSVLine(lines[0]).map(header => header.trim());
  const dataLines = lines.slice(1);
  const rows: GridRow[] = [];

  reportProgress(onProgress, 0, dataLines.length, 'queued');

  for (let start = 0; start < dataLines.length; start += chunkSize) {
    const chunk = dataLines.slice(start, start + chunkSize);
    chunk.forEach((line, offset) => {
      const cells = parseCSVLine(line);
      const row: GridRow = { id: start + offset + 1 };
      headers.forEach((header, index) => {
        row[header] = cells[index] ?? '';
      });
      rows.push(row);
    });

    reportProgress(onProgress, Math.min(start + chunk.length, dataLines.length), dataLines.length);
    await waitForNextBatch();
  }

  reportProgress(onProgress, dataLines.length, dataLines.length, 'complete');
  return rows;
}

function canUseWorker(useWorker = true): boolean {
  return (
    useWorker &&
    Platform.OS === 'web' &&
    typeof Worker !== 'undefined' &&
    typeof Blob !== 'undefined' &&
    typeof URL !== 'undefined' &&
    typeof URL.createObjectURL === 'function'
  );
}

function createBatchWorker(): Worker {
  const source = `
    const DEFAULT_CHUNK_SIZE = ${DEFAULT_CHUNK_SIZE};
    const waitForNextBatch = () => new Promise(resolve => setTimeout(resolve, 0));
    const progress = (id, processed, total, phase = 'processing') => {
      self.postMessage({ id, type: 'progress', progress: {
        processed,
        total,
        percent: total === 0 ? 100 : Math.round((processed / total) * 100),
        phase
      } });
    };
    const escapeCsvCell = value => {
      const str = value == null ? '' : String(value);
      return str.includes(',') || str.includes('"') || str.includes('\\n') || str.includes('\\r')
        ? '"' + str.replace(/"/g, '""') + '"'
        : str;
    };
    const parseCSVLine = line => {
      const cells = [];
      let current = '';
      let inQuotes = false;
      for (let index = 0; index < line.length; index += 1) {
        const char = line[index];
        const next = line[index + 1];
        if (char === '"' && inQuotes && next === '"') {
          current += '"';
          index += 1;
          continue;
        }
        if (char === '"') {
          inQuotes = !inQuotes;
          continue;
        }
        if (char === ',' && !inQuotes) {
          cells.push(current);
          current = '';
          continue;
        }
        current += char;
      }
      cells.push(current);
      return cells;
    };
    const splitCSVRows = csv => {
      const rows = [];
      let current = '';
      let inQuotes = false;
      for (let index = 0; index < csv.length; index += 1) {
        const char = csv[index];
        const next = csv[index + 1];
        if (char === '"' && inQuotes && next === '"') {
          current += char + next;
          index += 1;
          continue;
        }
        if (char === '"') inQuotes = !inQuotes;
        if ((char === '\\n' || char === '\\r') && !inQuotes) {
          if (char === '\\r' && next === '\\n') index += 1;
          rows.push(current);
          current = '';
          continue;
        }
        current += char;
      }
      if (current.length > 0) rows.push(current);
      return rows.filter(row => row.trim().length > 0);
    };
    self.onmessage = async event => {
      const request = event.data;
      try {
        const chunkSize = request.chunkSize || DEFAULT_CHUNK_SIZE;
        if (request.operation === 'export') {
          progress(request.id, 0, request.rows.length, 'queued');
          if (request.format === 'csv') {
            const lines = [request.columns.map(column => escapeCsvCell(column.title)).join(',')];
            for (let start = 0; start < request.rows.length; start += chunkSize) {
              const chunk = request.rows.slice(start, start + chunkSize);
              lines.push(...chunk.map(row => request.columns.map(column => escapeCsvCell(row[column.key])).join(',')));
              progress(request.id, Math.min(start + chunk.length, request.rows.length), request.rows.length);
              await waitForNextBatch();
            }
            progress(request.id, request.rows.length, request.rows.length, 'complete');
            self.postMessage({ id: request.id, type: 'complete', result: lines.join('\\n') });
            return;
          }
          const records = [];
          for (let start = 0; start < request.rows.length; start += chunkSize) {
            const chunk = request.rows.slice(start, start + chunkSize);
            records.push(...chunk.map(row => {
              const entry = {};
              request.columns.forEach(column => {
                entry[column.key] = row[column.key] == null ? null : row[column.key];
              });
              return entry;
            }));
            progress(request.id, Math.min(start + chunk.length, request.rows.length), request.rows.length);
            await waitForNextBatch();
          }
          progress(request.id, request.rows.length, request.rows.length, 'complete');
          self.postMessage({ id: request.id, type: 'complete', result: JSON.stringify(records, null, 2) });
          return;
        }
        const lines = splitCSVRows(request.csv);
        if (lines.length === 0) {
          progress(request.id, 0, 0, 'complete');
          self.postMessage({ id: request.id, type: 'complete', result: [] });
          return;
        }
        const headers = parseCSVLine(lines[0]).map(header => header.trim());
        const dataLines = lines.slice(1);
        const rows = [];
        progress(request.id, 0, dataLines.length, 'queued');
        for (let start = 0; start < dataLines.length; start += chunkSize) {
          const chunk = dataLines.slice(start, start + chunkSize);
          chunk.forEach((line, offset) => {
            const cells = parseCSVLine(line);
            const row = { id: start + offset + 1 };
            headers.forEach((header, index) => {
              row[header] = cells[index] == null ? '' : cells[index];
            });
            rows.push(row);
          });
          progress(request.id, Math.min(start + chunk.length, dataLines.length), dataLines.length);
          await waitForNextBatch();
        }
        progress(request.id, dataLines.length, dataLines.length, 'complete');
        self.postMessage({ id: request.id, type: 'complete', result: rows });
      } catch (error) {
        self.postMessage({ id: request.id, type: 'error', error: error instanceof Error ? error.message : String(error) });
      }
    };
  `;

  const blob = new Blob([source], { type: 'application/javascript' });
  return new Worker(URL.createObjectURL(blob));
}

function runWorkerRequest<T>(
  request: WorkerRequest,
  onProgress?: (progress: BatchProgress) => void
): Promise<T> {
  return new Promise((resolve, reject) => {
    const worker = createBatchWorker();

    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const message = event.data;
      if (message.id !== request.id) return;

      if (message.type === 'progress') {
        onProgress?.(message.progress);
        return;
      }

      worker.terminate();
      if (message.type === 'error') {
        reject(new Error(message.error));
        return;
      }

      resolve(message.result as T);
    };

    worker.onerror = event => {
      worker.terminate();
      reject(new Error(event.message));
    };

    worker.postMessage(request);
  });
}

/**
 * Initiates a batch data export operation.
 * It will seamlessly use a Web Worker if requested and available,
 * otherwise it falls back to native chunked processing with main-thread yielding.
 */
export function batchExportData<T extends GridRow>(
  options: BatchExportOptions<T>
): Promise<string> {
  const chunkSize = options.chunkSize ?? DEFAULT_CHUNK_SIZE;

  if (canUseWorker(options.useWorker)) {
    return runWorkerRequest<string>(
      {
        id: `export-${Date.now()}-${Math.random()}`,
        operation: 'export',
        rows: options.rows,
        columns: options.columns as ColumnDef[],
        format: options.format,
        chunkSize,
      },
      options.onProgress
    );
  }

  return exportInChunks({ ...options, chunkSize });
}

/**
 * Initiates a batch CSV data import operation.
 * It will seamlessly use a Web Worker if requested and available,
 * otherwise it falls back to native chunked processing with main-thread yielding.
 */
export function batchImportCSV(options: BatchImportOptions): Promise<GridRow[]> {
  const chunkSize = options.chunkSize ?? DEFAULT_CHUNK_SIZE;

  if (canUseWorker(options.useWorker)) {
    return runWorkerRequest<GridRow[]>(
      {
        id: `import-${Date.now()}-${Math.random()}`,
        operation: 'import',
        csv: options.csv,
        chunkSize,
      },
      options.onProgress
    );
  }

  return importCSVInChunks({ ...options, chunkSize });
}
