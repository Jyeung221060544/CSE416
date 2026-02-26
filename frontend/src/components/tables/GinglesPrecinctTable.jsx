/**
 * @file GinglesPrecinctTable.jsx
 * @description Paginated table of precinct-level Gingles data points. Clicking a
 *   row cross-highlights the corresponding dot on the Gingles scatter plot and
 *   vice-versa via the `selectedId` / `onSelectId` props. Automatically jumps
 *   to the page containing the selected precinct when the selection changes
 *   from the scatter plot.
 *
 * PROPS
 * @prop {Array}         points     - Array of enriched precinct point objects:
 *   { id, name, totalPop, regionType, minorityPop, avgHHIncome,
 *     demVotes, repVotes }
 *   Only points with `totalPop != null` are displayed (enriched rows).
 * @prop {string|null}   selectedId - ID of the currently selected precinct,
 *   or null for no selection.
 * @prop {Function}      onSelectId - Called with the clicked precinct id,
 *   or null to deselect.
 *
 * STATE SOURCES
 * - page / setPage : Local React state managing the current table page.
 *
 * LAYOUT
 * - <SurfacePanel> with fixed 404 px height and overflow-y scroll on rows.
 * - Sticky column header: Precinct | Pop | Region | Minority | Income | Dem | Rep.
 * - Scrollable data rows with per-row selection highlight.
 * - Pagination footer with prev/next chevrons and "n of N" counter.
 * - <InfoCallout> tip about cross-highlight interaction below the panel.
 */

/* ── Step 0: React hooks and icon imports ─────────────────────────────── */
import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, MousePointerClick } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import SurfacePanel from '@/components/ui/surface-panel'
import InfoCallout from '@/components/ui/info-callout'
import { REGION_CLS, DEM_TEXT, REP_TEXT, DEM_HEADER_TEXT, REP_HEADER_TEXT } from '@/lib/partyColors'
import { ROW_BORDER, ACTIVE_LABEL, INACTIVE_LABEL, rowBg } from '@/lib/tableStyles'

/* ── Step 1: Pagination constant and column layout ───────────────────── */
const PAGE_SIZE = 8

// Shared column definition — keeps header + rows in sync
const COLS = 'grid-cols-[1fr_50px_60px_62px_52px_50px_50px]'

/* ── Step 2: Formatting helpers ──────────────────────────────────────── */
/**
 * Formats a number with locale-appropriate thousands separators, or "—" if null/undefined.
 * @param {number|null|undefined} n - Value to format.
 * @returns {string}
 */
function fmt(n)       { return n?.toLocaleString() ?? '—' }

/**
 * Formats a household income value in thousands (e.g. 75000 → "$75k"),
 * or "—" if null/undefined.
 * @param {number|null|undefined} n - Income in dollars.
 * @returns {string}
 */
function fmtIncome(n) { return n == null ? '—' : '$' + (n / 1000).toFixed(0) + 'k' }

/* ── Step 3: Main GinglesPrecinctTable component ─────────────────────── */
/**
 * Renders the paginated precinct detail table for Gingles analysis.
 * Selecting a row notifies the parent so the scatter plot can cross-highlight.
 *
 * @param {object}      props
 * @param {Array}       props.points     - Array of precinct data objects.
 * @param {string|null} props.selectedId - ID of the currently selected precinct.
 * @param {Function}    props.onSelectId - Callback to update the selection.
 * @returns {JSX.Element} Paginated table panel with footer hint, or an
 *   empty-state message if no enriched rows exist.
 */
export default function GinglesPrecinctTable({ points = [], selectedId, onSelectId }) {
    /* ── Step 3a: Filter to only enriched points with population data ── */
    const rows = points.filter(p => p.totalPop != null) // only enriched points (black + white)

    /* ── Step 3b: Pagination state ── */
    // ── Auto-jump to page of selectedId ──────────────────────────────────────
    const [page, setPage] = useState(0)
    const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE))

    /* ── Step 3c: Auto-jump to the page containing the selected row ── */
    useEffect(() => {
        if (!selectedId) return
        const idx = rows.findIndex(p => p.id === selectedId)
        if (idx >= 0) setPage(Math.floor(idx / PAGE_SIZE))
    }, [selectedId]) // eslint-disable-line react-hooks/exhaustive-deps

    /* ── Step 3d: Slice to current page ── */
    const pageRows = rows.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE)

    /* ── Step 3e: Empty state guard ── */
    if (!rows.length) {
        return (
            <SurfacePanel className="h-[404px] border-brand-muted/25 bg-white flex items-center justify-center">
                <p className="text-brand-muted/60 text-sm italic">No precinct detail data available.</p>
            </SurfacePanel>
        )
    }

    /* ── Step 3f: Render ── */
    return (
        <div className="flex flex-col gap-2">

            <SurfacePanel className="h-[404px] border-brand-muted/25 flex flex-col overflow-hidden">

                {/* ── COLUMN HEADER ──────────────────────────────────── */}
                {/* ── Sticky column header ── */}
                <div className={`shrink-0 ${COLS} grid items-center px-3 py-2.5 bg-brand-darkest text-brand-surface text-xs font-semibold`}>
                    <span>Precinct</span>
                    <span className="text-center">Pop</span>
                    <span className="text-center">Region</span>
                    <span className="text-right">Minority</span>
                    <span className="text-right">Income</span>
                    <span className={`text-right ${DEM_HEADER_TEXT}`}>Dem</span>
                    <span className={`text-right ${REP_HEADER_TEXT}`}>Rep</span>
                </div>

                {/* ── DATA ROWS ──────────────────────────────────────── */}
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
                                    'items-center px-3 py-2.5 cursor-pointer transition-colors duration-100',
                                    ROW_BORDER,
                                    rowBg(i, isSelected),
                                ].join(' ')}
                            >
                                {/* Precinct name */}
                                <p className={`text-xs font-semibold leading-tight truncate pr-2 ${isSelected ? ACTIVE_LABEL : INACTIVE_LABEL}`}>
                                    {row.name}
                                </p>

                                {/* Total population */}
                                <span className="text-center tabular-nums text-brand-deep text-xs">
                                    {fmt(row.totalPop)}
                                </span>

                                {/* Region type badge */}
                                <div className="flex justify-center">
                                    <Badge
                                        variant="outline"
                                        className={`text-[10px] font-semibold px-1.5 py-0.5 leading-tight capitalize w-full text-center ${REGION_CLS[row.regionType] ?? ''}`}
                                    >
                                        {row.regionType ?? '—'}
                                    </Badge>
                                </div>

                                {/* Minority population count */}
                                <span className="text-right tabular-nums text-brand-deep text-xs">
                                    {fmt(row.minorityPop)}
                                </span>

                                {/* Average household income */}
                                <span className="text-right tabular-nums text-brand-deep text-xs">
                                    {fmtIncome(row.avgHHIncome)}
                                </span>

                                {/* Democratic vote count */}
                                <span className={`text-right tabular-nums font-bold ${DEM_TEXT} text-xs`}>
                                    {fmt(row.demVotes)}
                                </span>

                                {/* Republican vote count */}
                                <span className={`text-right tabular-nums font-bold ${REP_TEXT} text-xs`}>
                                    {fmt(row.repVotes)}
                                </span>
                            </div>
                        )
                    })}
                </div>

                {/* ── PAGINATION FOOTER ──────────────────────────────── */}
                {/* ── Pagination footer ── */}
                <div className="shrink-0 border-t border-brand-muted/20 bg-brand-primary/[0.03] px-3 py-2 flex items-center justify-between gap-2">
                    {/* Row range indicator */}
                    <span className="text-[11px] text-brand-muted/70">
                        {page * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE + PAGE_SIZE, rows.length)} of {rows.length} precincts
                        {selectedId ? ' · 1 selected' : ''}
                    </span>

                    {/* Prev / next page buttons */}
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

            {/* ── INTERACTION HINT ───────────────────────────────────── */}
            {/* ── Interaction hint ── */}
            <InfoCallout icon={MousePointerClick}>
                Click a row or a scatter dot to cross-highlight!
            </InfoCallout>
        </div>
    )
}
