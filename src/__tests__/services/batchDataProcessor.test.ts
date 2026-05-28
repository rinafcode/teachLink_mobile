import { batchExportData, batchImportCSV } from '../../services/batchDataProcessor';
import { ColumnDef, GridRow } from '../../utils/gridUtils';

describe('batchDataProcessor', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const columns: ColumnDef[] = [
    { key: 'id', title: 'ID', sortable: true },
    { key: 'name', title: 'Name', sortable: true },
    { key: 'value', title: 'Value', sortable: true },
  ];

  it('exports data in chunks and reports progress', async () => {
    const rows: GridRow[] = Array.from({ length: 1500 }, (_, i) => ({
      id: i + 1,
      name: `Item ${i + 1}`,
      value: (i + 1) * 10,
    }));

    const progressSpy = jest.fn();

    const exportPromise = batchExportData({
      rows,
      columns,
      format: 'csv',
      chunkSize: 500,
      onProgress: progressSpy,
      useWorker: false, // Ensure we test the chunked fallback logic
    });

    // Advance timers to clear the yielding (setTimeout/requestAnimationFrame)
    for (let i = 0; i < 5; i++) {
      jest.runAllTimers();
      await Promise.resolve();
    }

    const result = await exportPromise;

    expect(result).toContain('ID,Name,Value');
    expect(result).toContain('1500,Item 1500,15000');

    // Should have reported progress multiple times
    expect(progressSpy).toHaveBeenCalled();
    const lastCall = progressSpy.mock.calls[progressSpy.mock.calls.length - 1][0];
    expect(lastCall.percent).toBe(100);
    expect(lastCall.phase).toBe('complete');
  });

  it('imports data in chunks and reports progress', async () => {
    let csv = 'ID,Name,Value\n';
    for (let i = 0; i < 1500; i++) {
      csv += `${i + 1},Item ${i + 1},${(i + 1) * 10}\n`;
    }

    const progressSpy = jest.fn();

    const importPromise = batchImportCSV({
      csv,
      chunkSize: 500,
      onProgress: progressSpy,
      useWorker: false,
    });

    for (let i = 0; i < 5; i++) {
      jest.runAllTimers();
      await Promise.resolve();
    }

    const rows = await importPromise;

    expect(rows.length).toBe(1500);
    expect(rows[0]).toEqual({ id: 1, ID: '1', Name: 'Item 1', Value: '10' });

    expect(progressSpy).toHaveBeenCalled();
    const lastCall = progressSpy.mock.calls[progressSpy.mock.calls.length - 1][0];
    expect(lastCall.percent).toBe(100);
    expect(lastCall.phase).toBe('complete');
  });
});
