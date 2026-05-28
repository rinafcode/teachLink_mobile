# Batch Data Processing

Large grid imports and exports should use `batchExportData` and `batchImportCSV` from
`src/services/batchDataProcessor.ts`.

The processor uses a Web Worker on web builds when workers are available. Native and test
environments use the same chunked implementation with short async yields (via `requestAnimationFrame`) between chunks, so the UI
thread can render progress and respond to touches while work continues.

## Export

```ts
const csv = await batchExportData({
  rows,
  columns,
  format: 'csv',
  chunkSize: 500,
  onProgress: ({ percent }) => setProgress(percent),
});
```

`AdvancedDataGrid` uses `useDataGrid().exportDataAsync()` for its share-sheet exporter. Progress is
shown in the export toolbar while CSV or JSON is prepared.

## Import

```ts
const rows = await batchImportCSV({
  csv,
  chunkSize: 500,
  onProgress: ({ processed, total }) => setImportedCount(`${processed}/${total}`),
});
```

The CSV importer reads the first row as headers, assigns generated numeric `id` values, and preserves
quoted commas, quotes, and multiline values.

## Testing Large Files

Use a generated fixture of at least 1,000 rows and a small `chunkSize` to verify multiple progress
updates:

```ts
await batchExportData({
  rows: largeRows,
  columns,
  format: 'csv',
  chunkSize: 250,
  onProgress: progressSpy,
  useWorker: false,
});
```

Set `useWorker: false` in tests for deterministic fallback behavior. Leave it unset in the app so web
builds use a worker automatically.
