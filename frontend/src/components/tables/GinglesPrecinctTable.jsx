import { useState, useEffect, useRef } from 'react'
import { ChevronLeft, ChevronRight, MousePointerClick } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import SurfacePanel from '@/components/ui/surface-panel'
import InfoCallout from '@/components/ui/info-callout'
import { REGION_CLS, DEM_TEXT, REP_TEXT, DEM_HEADER_TEXT, REP_HEADER_TEXT } from '@/lib/partyColors'
import { ROW_BORDER, ACTIVE_LABEL, INACTIVE_LABEL, rowBg } from '@/lib/tableStyles'

const ROW_HEIGHT = 40

const COLS = 'grid-cols-[1fr_50px_60px_62px_52px_50px_50px]'


function fmt(n)       { return (n == null || isNaN(n)) ? '—' : n.toLocaleString() }
function fmtIncome(n) { return (n == null || isNaN(n)) ? '—' : '$' + (n / 1000).toFixed(0) + 'k' }

/**
 * Paginated table of Gingles precinct data, cross-highlights with GinglesScatterPlot.
 * Page size adapts dynamically so rows fill the available panel height.
 *
 * @param {Object[]} points    - Array of precinct objects from the scatter plot data set.
 * @param {string|null} selectedId  - ID of the currently selected precinct (controlled externally).
 * @param {Function} onSelectId     - Callback fired with the precinct ID on row click, or null to deselect.
 */
export default function GinglesPrecinctTable({ points = [], selectedId, onSelectId }) {
    // Step 0: Filter out precincts with no population data (incomplete records)
    const rows = points.filter(p => p.totalPop != null)

    // Step 1: Measure the scrollable area so page size adapts to panel height
    const rowsRef = useRef(null)
    const [rowsHeight, setRowsHeight] = useState(0)

    useEffect(() => {
        if (!rowsRef.current) return
        const ro = new ResizeObserver(([entry]) => setRowsHeight(entry.contentRect.height))
        ro.observe(rowsRef.current)
        return () => ro.disconnect()
    }, [rows.length])

    // Step 2: Derive page size and total pages from measured height
    const pageSize   = Math.max(1, Math.floor(rowsHeight / ROW_HEIGHT))
    const totalPages = Math.max(1, Math.ceil(rows.length / pageSize))

    const [page, setPage] = useState(0)

    // Step 3: Clamp current page if pageSize changes and the last page shrinks
    useEffect(() => {
        setPage(p => Math.min(p, totalPages - 1))
    }, [totalPages])

    // Step 4: When a precinct is selected externally (e.g. scatter dot click), jump to its page
    useEffect(() => {
        if (!selectedId) return
        const idx = rows.findIndex(p => p.id === selectedId)
        if (idx >= 0) setPage(Math.floor(idx / pageSize))
    }, [selectedId, pageSize])

    // Step 5: Slice the visible rows for the current page
    const pageRows = rows.slice(page * pageSize, page * pageSize + pageSize)

    // Step 6: Guard — render empty state if no valid rows exist
    if (!rows.length) {
        return (
            <SurfacePanel className="flex-1 min-h-0 border-brand-muted/25 bg-white flex items-center justify-center">
                <p className="text-brand-muted/60 text-sm italic">No precinct detail data available.</p>
            </SurfacePanel>
        )
    }

    // Step 7: Render the table — header, paginated rows, and pagination controls
    return (
        <div className="flex flex-col gap-2 h-full">

            <SurfacePanel className="flex-1 min-h-0 border-brand-muted/25 flex flex-col overflow-hidden">

                {/* Column header row */}
                <div className={`shrink-0 ${COLS} grid items-center px-3 py-2.5 bg-brand-darkest text-brand-surface text-xs font-semibold`}>
                    <span className="text-center">Precinct</span>
                    <span className="text-center">Pop</span>
                    <span className="text-center pl-3">Region</span>
                    <span className="text-center">Minority</span>
                    <span className="text-center">Income</span>
                    <span className={`text-center ${DEM_HEADER_TEXT}`}>Dem</span>
                    <span className={`text-center ${REP_HEADER_TEXT}`}>Rep</span>
                </div>

                {/* Scrollable body — measured by ResizeObserver (Step 1) */}
                <div ref={rowsRef} className="flex-1 overflow-y-auto min-h-0">
                    {pageRows.map((row, i) => {
                        const isSelected = row.id === selectedId
                        return (
                            <div
                                key={row.id}
                                onClick={() => onSelectId?.(isSelected ? null : row.id)}
                                className={[
                                    `grid ${COLS}`,
                                    'items-center px-3 py-2.5 cursor-pointer transition-colors duration-100',
                                    ROW_BORDER,
                                    rowBg(i, isSelected),
                                ].join(' ')}
                            >
                                <p className={`text-xs font-semibold leading-tight truncate pr-2 ${isSelected ? ACTIVE_LABEL : INACTIVE_LABEL}`}>
                                    {row.name}
                                </p>
                                <span className="text-right tabular-nums text-brand-deep text-xs">
                                    {fmt(row.totalPop)}
                                </span>
                                <div className="flex justify-center pl-3">
                                    <Badge
                                        variant="outline"
                                        className={`text-[10px] font-semibold px-1.5 py-0.5 leading-tight capitalize w-full text-center ${REGION_CLS[row.regionType] ?? ''}`}
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
                                <span className={`text-right tabular-nums font-bold ${DEM_TEXT} text-xs`}>
                                    {fmt(row.demVotes)}
                                </span>
                                <span className={`text-right tabular-nums font-bold ${REP_TEXT} text-xs`}>
                                    {fmt(row.repVotes)}
                                </span>
                            </div>
                        )
                    })}
                </div>

                {/* Pagination footer — row range label + prev/next buttons */}
                <div className="shrink-0 border-t border-brand-muted/20 bg-brand-primary/[0.03] px-3 py-2 flex items-center justify-between gap-2">
                    <span className="text-[11px] text-brand-muted/70">
                        {page * pageSize + 1}–{Math.min(page * pageSize + pageSize, rows.length)} of {rows.length} precincts
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

            <InfoCallout icon={MousePointerClick}>
                Click a row or a scatter dot to cross-highlight!
            </InfoCallout>
        </div>
    )
}
