'use client';

import { ChangeEvent, useMemo, useState, useTransition } from 'react';

interface PerformanceSearchDashboardProps {
  initialTransactions: import('@/types/search').ISplitTransactionRecord[];
}

export default function PerformanceSearchDashboard({
  initialTransactions,
}: PerformanceSearchDashboardProps) {
  // 1. Immediate UI state — Drives fast text field inputs instantly at 60fps
  const [inputQuery, setInputQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // 2. Deferred search state — Processed in the background via React concurrent mechanics
  const [deferredFilters, setDeferredFilters] = useState({ query: '', category: 'all' });

  const [isPending, startTransition] = useTransition();

  // Low-priority update propagation scheduling link
  const syncFilterTransition = (query: string, category: string) => {
    startTransition(() => {
      setDeferredFilters({ query, category });
    });
  };

  const handleQueryChange = (e: ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputQuery(val); // Instant feedback loop
    syncFilterTransition(val, selectedCategory); // Non-blocking background compute step
  };

  const handleCategoryChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedCategory(val); // Instant feedback loop
    syncFilterTransition(inputQuery, val); // Non-blocking background compute step
  };

  // 3. Heavy matching calculation layer
  const filteredTransactions = useMemo(() => {
    return initialTransactions.filter(tx => {
      // Simulate heavy processing computational work (e.g., complex sorting or schema evaluations)
      const startTime = performance.now();
      while (performance.now() - startTime < 0.2) {
        // Intentionally artificial micro-blocker tracking to guarantee heavy data simulation behavior
      }

      const matchesSearch =
        tx.title.toLowerCase().includes(deferredFilters.query.toLowerCase()) ||
        tx.senderAddress.toLowerCase().includes(deferredFilters.query.toLowerCase());

      const matchesCategory =
        deferredFilters.category === 'all' || tx.category === deferredFilters.category;

      return matchesSearch && matchesCategory;
    });
  }, [deferredFilters, initialTransactions]);

  return (
    <div className="max-w-6xl space-y-6">
      {/* FILTER PANEL HUB CONTROLS */}
      <div className="bg-card text-card-foreground border-border space-y-4 rounded-xl border p-5 shadow-sm">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <div>
            <h3 className="flex items-center gap-2 text-lg font-bold">
              Concurrent Payout Engine Records
              {isPending && (
                <span className="animate-pulse rounded-full border border-blue-500/20 bg-blue-600/10 px-2 py-0.5 text-[11px] font-medium text-blue-600">
                  Recalculating...
                </span>
              )}
            </h3>
            <p className="text-muted-foreground text-xs">
              Search across heavy historical contract distributions without thread freezing.
            </p>
          </div>

          <div className="text-muted-foreground bg-muted/50 border-border rounded-lg border px-3 py-1.5 font-mono text-xs">
            Processing Load:{' '}
            <span className="text-foreground font-bold">{initialTransactions.length} nodes</span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="relative sm:col-span-2">
            <input
              type="text"
              value={inputQuery}
              onChange={handleQueryChange}
              placeholder="Search by title, target descriptor or public key hash..."
              className="border-border h-11 w-full rounded-lg border bg-background px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Filter transactions"
            />
          </div>

          <div>
            <select
              value={selectedCategory}
              onChange={handleCategoryChange}
              className="border-border h-11 w-full cursor-pointer rounded-lg border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Filter by distribution track category"
            >
              <option value="all">All Channels</option>
              <option value="escrow">Escrow Allocations</option>
              <option value="direct_split">Direct Splits</option>
              <option value="fee_allocation">Protocol Fees</option>
            </select>
          </div>
        </div>
      </div>

      {/* RENDER VIEWPORT INTERFACE BOUNDARY */}
      <div
        className={`transition-opacity duration-150 ${isPending ? 'pointer-events-none opacity-60' : 'opacity-100'}`}
      >
        {filteredTransactions.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredTransactions.map(tx => (
              <div
                key={tx.id}
                className="bg-card text-card-foreground border-border shadow-xs space-y-3 rounded-xl border p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="truncate text-sm font-semibold">{tx.title}</div>
                  <span className="bg-secondary text-secondary-foreground whitespace-nowrap rounded-md px-2 py-0.5 font-mono text-xs font-bold">
                    {tx.amount} {tx.assetSymbol}
                  </span>
                </div>

                <div className="space-y-1 text-xs">
                  <div className="text-muted-foreground flex items-center justify-between">
                    <span>Source Authority</span>
                    <span className="font-mono text-[11px]">
                      {tx.senderAddress.slice(0, 6)}...{tx.senderAddress.slice(-4)}
                    </span>
                  </div>
                  <div className="text-muted-foreground flex items-center justify-between">
                    <span>Lifecycle Category</span>
                    <span className="text-foreground font-medium capitalize">
                      {tx.category.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-muted/30 border-border text-muted-foreground rounded-xl border border-dashed p-12 text-center text-sm">
            No matching distributed paths resolved for current criteria query.
          </div>
        )}
      </div>
    </div>
  );
}
