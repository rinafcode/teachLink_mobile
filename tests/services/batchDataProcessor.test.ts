import { batchExportData, batchImportCSV } from '../../src/services/batchDataProcessor';
import { ColumnDef, GridRow } from '../../src/utils/gridUtils';

interface ImportRow extends GridRow {
  id: number;
  name: string;
  email: string;
}

const columns: ColumnDef<ImportRow>[] = [
  { key: 'id', title: 'ID', type: 'number' },
  { key: 'name', title: 'Name', type: 'string' },
  { key: 'email', title: 'Email', type: 'string' },
];

const rows: ImportRow[] = Array.from({ length: 1200 }, (_, index) => ({
  id: index + 1,
  name: index === 5 ? 'Smith, Jane' : `Student ${index + 1}`,
  email: `student${index + 1}@example.com`,
}));

describe('batchDataProcessor', () => {
  it('exports CSV in chunks and reports progress', async () => {
    const progress = jest.fn();

    const csv = await batchExportData({
      rows,
      columns,
      format: 'csv',
      chunkSize: 500,
      onProgress: progress,
      useWorker: false,
    });

    const lines = csv.split('\n');
    expect(lines).toHaveLength(rows.length + 1);
    expect(lines[0]).toBe('ID,Name,Email');
    expect(csv).toContain('"Smith, Jane"');
    expect(progress).toHaveBeenCalledWith(
      expect.objectContaining({ processed: 0, phase: 'queued' })
    );
    expect(progress).toHaveBeenLastCalledWith(
      expect.objectContaining({ processed: rows.length, percent: 100, phase: 'complete' })
    );
    expect(progress.mock.calls.length).toBeGreaterThanOrEqual(4);
  });

  it('exports JSON in chunks with only configured columns', async () => {
    const json = await batchExportData({
      rows,
      columns: columns.slice(0, 2),
      format: 'json',
      chunkSize: 300,
      useWorker: false,
    });

    const parsed = JSON.parse(json);
    expect(parsed).toHaveLength(rows.length);
    expect(Object.keys(parsed[0])).toEqual(['id', 'name']);
  });

  it('imports CSV in chunks and preserves quoted commas and newlines', async () => {
    const progress = jest.fn();
    const csv = ['Name,Email', '"Doe, Sam",sam@example.com', '"Line\nBreak",line@example.com'].join(
      '\n'
    );

    const imported = await batchImportCSV({
      csv,
      chunkSize: 1,
      onProgress: progress,
      useWorker: false,
    });

    expect(imported).toEqual([
      { id: 1, Name: 'Doe, Sam', Email: 'sam@example.com' },
      { id: 2, Name: 'Line\nBreak', Email: 'line@example.com' },
    ]);
    expect(progress).toHaveBeenLastCalledWith(
      expect.objectContaining({ processed: 2, percent: 100, phase: 'complete' })
    );
  });
});
