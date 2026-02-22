import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, MousePointerClick } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import SurfacePanel from '@/components/ui/surface-panel'
import InfoCallout from '@/components/ui/info-callout'

const PAGE_SIZE = 8

// ── Region badge colours ────────────────────────────────────────────────────
const REGION_CLS = {
    urban:    'bg-purple-50 text-purple-700 border-purple-200',
    suburban: 'bg-sky-50    text-sky-700    border-sky-200',
    rural:    'bg-amber-50  text-amber-700  border-amber-200',
}

// Shared column definition — keeps header + rows in sync
const COLS = 'grid-cols-[1fr_50px_60px_62px_52px_50px_50px]'

function fmt(n)       { return n?.toLocaleString() ?? '—' }
function fmtIncome(n) { return n == null ? '—' : '$' + (n / 1000).toFixed(0) + 'k' }

export default function GinglesPrecinctTable({ points = [], selectedId, onSelectId }) {
    const rows = points.filter(p => p.totalPop != null) // only enriched points (black + white)

    // ── Auto-jump to page of selectedId ──────────────────────────────────────
    const [page, setPage] = useState(0)
    const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE))

    useEffect(() => {
        if (!selectedId) return
        const idx = rows.findIndex(p => p.id === selectedId)
        if (idx >= 0) setPage(Math.floor(idx / PAGE_SIZE))
    }, [selectedId]) // eslint-disable-line react-hooks/exhaustive-deps

    const pageRows = rows.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE)

    if (!rows.length) {
        return (
            <SurfacePanel className="h-[404px] border-brand-muted/25 bg-white flex items-center justify-center">
                <p className="text-brand-muted/60 text-sm italic">No precinct detail data available.</p>
            </SurfacePanel>
        )
    }

    return (
        <div className="flex flex-col gap-2">

            <SurfacePanel className="h-[404px] border-brand-muted/25 flex flex-col overflow-hidden">

                {/* ── Sticky column header ── */}
                <div className={`shrink-0 ${COLS} grid items-center px-3 py-2.5 bg-brand-darkest text-brand-surface text-xs font-semibold`}>
                    <span>Precinct</span>
                    <span className="text-center">Pop</span>
                    <span className="text-center">Region</span>
                    <span className="text-right">Minority</span>
                    <span className="text-right">Income</span>
                    <span className="text-right text-blue-300">Dem</span>
                    <span className="text-right text-red-300">Rep</span>
                </div>

                {/* ── Data rows ── */}
                <div className="flex-1 overflow-y-auto min-h-0">
                    {pageRows.map((row, i) => {
                        const isSelected = row.id === selectedId
                        return (
                            <div
                                key={row.id}
                                onClick={() => onSelectId?.(isSelected ? null : row.id)}
                                className={[
                                    `grid ${COLS}`,
                                    'items-center px-3 py-2.5 border-t border-brand-muted/15 cursor-pointer',
                                    'transition-colors duration-100',
                                    isSelected
                                        ? 'bg-brand-primary/15 ring-1 ring-inset ring-brand-primary/30'
                                        : i % 2 === 0 ? 'bg-white hover:bg-brand-surface/50' : 'bg-brand-surface/40 hover:bg-brand-surface/70',
                                ].join(' ')}
                            >
                                <p className={`text-xs font-semibold leading-tight truncate pr-2 ${isSelected ? 'text-brand-primary' : 'text-brand-darkest'}`}>
                                    {row.name}
                                </p>

                                <span className="text-center tabular-nums text-brand-deep text-xs">
                                    {fmt(row.totalPop)}
                                </span>

                                <div className="flex justify-center">
                                    <Badge
                                        variant="outline"
                                        className={`text-[10px] font-semibold px-1.5 py-0.5 leading-tight capitalize ${REGION_CLS[row.regionType] ?? ''}`}
                                    >
                                        {row.regionType ?? '—'}
                                    </Badge>
                                </div>

                                <span className="text-right tabular-nums text-brand-deep text-xs">
                                    {fmt(row.minorityPop)}
                                </span>

                                <span className="text-right tabular-nums text-brand-deep text-xs">
                                    {fmtIncome(row.avgHHIncome)}
                                </span>

                                <span className="text-right tabular-nums font-bold text-blue-600 text-xs">
                                    {fmt(row.demVotes)}
                                </span>

                                <span className="text-right tabular-nums font-bold text-red-600 text-xs">
                                    {fmt(row.repVotes)}
                                </span>
                            </div>
                        )
                    })}
                </div>

                {/* ── Pagination footer ── */}
                <div className="shrink-0 border-t border-brand-muted/20 bg-brand-primary/[0.03] px-3 py-2 flex items-center justify-between gap-2">
                    <span className="text-[11px] text-brand-muted/70">
                        {page * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE + PAGE_SIZE, rows.length)} of {rows.length} precincts
                        {selectedId ? ' · 1 selected' : ''}
                    </span>

                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => setPage(p => Math.max(0, p - 1))}
                            disabled={page === 0}
                            className="p-1 rounded hover:bg-brand-muted/15 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            aria-label="Previous page"
                        >
                            <ChevronLeft className="w-3.5 h-3.5 text-brand-deep" />
                        </button>

                        <span className="text-[11px] text-brand-muted/70 tabular-nums min-w-[44px] text-center">
                            {page + 1} / {totalPages}
                        </span>

                        <button
                            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                            disabled={page === totalPages - 1}
                            className="p-1 rounded hover:bg-brand-muted/15 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            aria-label="Next page"
                        >
                            <ChevronRight className="w-3.5 h-3.5 text-brand-deep" />
                        </button>
                    </div>
                </div>

            </SurfacePanel>

            {/* ── Interaction hint ── */}
            <InfoCallout icon={MousePointerClick}>
                Click a row or a scatter dot to cross-highlight. <strong>Dem</strong> and <strong>Rep</strong> columns show raw vote counts from the 2024 general election.
            </InfoCallout>

        </div>
    )
}
