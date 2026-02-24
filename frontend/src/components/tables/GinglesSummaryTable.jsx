/**
 * @file GinglesSummaryTable.jsx
 * @description Summary table for Gingles precondition analysis. Precincts are
 *   binned by minority Voting Age Population (VAP) percentage; each row shows
 *   the average Democratic and Republican vote share for that bin, a visual
 *   split bar, and an outcome badge. A polarization signal footer explains
 *   whether the data supports Gingles preconditions #2 or #3.
 *
 * PROPS
 * @prop {Array}       summaryRows - Array of bin-level summary objects:
 *   { rangeLabel, precinctCount, avgDemocraticVoteShare }
 *   Only rows with precinctCount > 0 are displayed.
 * @prop {string|null} raceFilter  - Currently selected race key (e.g. "black").
 *   Used for display-name capitalization in headers and the footer.
 *
 * STATE SOURCES
 * - No local state. All data flows in via props.
 *
 * LAYOUT
 * - <SurfacePanel> with fixed 404 px height and overflow-y scroll on rows.
 * - Description strip explaining the binning methodology.
 * - Sticky column header: VAP Range | n | Avg Dem | Avg Rep | Result.
 * - Scrollable data rows; each row includes a <SplitBar> mini chart.
 * - Polarization signal footer (shown only when trend direction is computable).
 */

/* ── Step 0: UI component and utility imports ─────────────────────────── */
import { Badge } from '@/components/ui/badge'
import SurfacePanel from '@/components/ui/surface-panel'
import { getOutcome, DEM_TEXT, REP_TEXT, DEM_HEADER_TEXT, REP_HEADER_TEXT } from '@/lib/partyColors'
import { ROW_BORDER, rowBg } from '@/lib/tableStyles'

/* ── Step 1: SplitBar sub-component ──────────────────────────────────── */
/**
 * Renders a mini horizontal Dem/Rep split bar beneath the range label.
 * The blue (Dem) segment fills `demPct`% from the left; the rest is red (Rep).
 *
 * @param {object} props
 * @param {number} props.demPct - Democratic share as a percentage (0–100).
 * @returns {JSX.Element} A small rounded progress-bar element.
 */
// ── Mini Dem/Rep split bar ─────────────────────────────────────────────
function SplitBar({ demPct }) {
    return (
        <div className="mt-1.5 h-1.5 w-full rounded-full overflow-hidden bg-red-200">
            <div className="h-full bg-blue-400 rounded-full" style={{ width: `${demPct}%` }} />
        </div>
    )
}

/* ── Step 2: Main GinglesSummaryTable component ───────────────────────── */
/**
 * Renders the bin-level summary table for the Gingles racial-polarization analysis.
 *
 * @param {object}     props
 * @param {Array}      props.summaryRows - Bin summary rows (filtered to count > 0).
 * @param {string}     props.raceFilter  - Selected race group key for labeling.
 * @returns {JSX.Element} Summary table panel with optional polarization footer,
 *   or an empty-state message if no data.
 */
export default function GinglesSummaryTable({ summaryRows, raceFilter }) {
    /* ── Step 2a: Filter to populated bins and derive display name ── */
    const rows     = (summaryRows ?? []).filter(r => r.precinctCount > 0)
    const raceName = raceFilter
        ? raceFilter.charAt(0).toUpperCase() + raceFilter.slice(1)
        : 'Minority'

    /* ── Step 2b: Compute cohesion trend from first vs. last bin ── */
    // Cohesion signal: first vs last populated bin
    const firstDem = rows[0]?.avgDemocraticVoteShare ?? null
    const lastDem  = rows[rows.length - 1]?.avgDemocraticVoteShare ?? null
    const trending = firstDem !== null && lastDem !== null
        ? lastDem > firstDem ? 'up' : 'down'
        : null

    /* ── Step 2c: Empty state guard ── */
    if (!rows.length) {
        return (
            <SurfacePanel className="h-[404px] border-brand-muted/25 bg-white flex items-center justify-center">
                <p className="text-brand-muted/60 text-sm italic">No summary data available.</p>
            </SurfacePanel>
        )
    }

    /* ── Step 2d: Render ── */
    return (
        <SurfacePanel className="h-[404px] border-brand-muted/25 flex flex-col overflow-hidden">

            {/* ── METHODOLOGY DESCRIPTION STRIP ─────────────────────── */}
            {/* ── Description strip ── */}
            <div className="shrink-0 px-4 py-2 bg-brand-darkest/90 border-b border-white/10">
                <p className="text-[10px] text-brand-muted/70 leading-snug">
                    Precincts are binned by <span className="text-brand-surface/80 font-semibold">{raceName} VAP %</span>.{' '}
                    <span className="text-blue-300 font-semibold">Avg Dem</span> and <span className="text-red-300 font-semibold">Avg Rep</span> are the <span className="text-brand-surface/80 font-semibold">arithmetic mean of actual precinct vote shares</span> within each bin — not from the regression curve, and not individual voter choices.
                </p>
            </div>

            {/* ── COLUMN HEADER ──────────────────────────────────────── */}
            {/* ── Sticky column header ── */}
            <div className="shrink-0 grid grid-cols-[1fr_40px_60px_60px_88px] items-center px-4 py-2.5 bg-brand-darkest text-brand-surface text-xs font-semibold">
                <span>{raceName} VAP Range</span>
                <span className="text-center">n</span>
                <span className={`text-right ${DEM_HEADER_TEXT}`}>Avg Dem</span>
                <span className={`text-right ${REP_HEADER_TEXT}`}>Avg Rep</span>
                <span className="text-center">Result</span>
            </div>

            {/* ── DATA ROWS ──────────────────────────────────────────── */}
            {/* ── Data rows ── */}
            <div className="flex-1 overflow-y-auto min-h-0">
                {rows.map((row, i) => {
                    /* Step 2d-i: Derive per-row values */
                    const demPct  = row.avgDemocraticVoteShare * 100
                    const repPct  = 100 - demPct
                    const margin  = Math.abs(demPct - repPct)
                    const isDem   = demPct >= 50
                    const outcome = getOutcome(row.avgDemocraticVoteShare)

                    return (
                        <div
                            key={row.rangeLabel}
                            className={[
                                'grid grid-cols-[1fr_40px_60px_60px_88px] items-center',
                                'px-4 py-3',
                                ROW_BORDER,
                                rowBg(i),
                            ].join(' ')}
                        >
                            {/* Range label + visual split bar */}
                            <div className="min-w-0 pr-2">
                                <p className="text-brand-darkest font-semibold text-sm leading-tight">
                                    {row.rangeLabel}
                                </p>
                                <SplitBar demPct={demPct} />
                            </div>

                            {/* Precinct count */}
                            <span className="text-center tabular-nums text-brand-deep text-sm font-medium">
                                {row.precinctCount}
                            </span>

                            {/* Avg Dem share */}
                            <span className={`text-right tabular-nums font-bold ${DEM_TEXT} text-sm`}>
                                {demPct.toFixed(1)}%
                            </span>

                            {/* Derived avg Rep share */}
                            <span className={`text-right tabular-nums font-bold ${REP_TEXT} text-sm`}>
                                {repPct.toFixed(1)}%
                            </span>

                            {/* Outcome badge + margin */}
                            <div className="flex flex-col items-center gap-0.5">
                                <Badge
                                    variant="outline"
                                    className={`text-[10px] font-semibold px-1.5 py-0.5 leading-tight ${outcome.cls}`}
                                >
                                    {outcome.label}
                                </Badge>
                                <span className={`text-[10px] font-bold tabular-nums ${isDem ? DEM_TEXT : REP_TEXT}`}>
                                    {isDem ? 'D' : 'R'}+{margin.toFixed(1)}%
                                </span>
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* ── POLARIZATION SIGNAL FOOTER ─────────────────────────── */}
            {/* ── Cohesion insight footer ── */}
            {trending && (
                <div className="shrink-0 border-t border-brand-muted/20 bg-brand-primary/[0.04] px-4 py-3">
                    <p className="text-[11px] text-brand-muted/80 leading-relaxed">
                        <span className="font-semibold text-brand-deep">Polarization signal — </span>
                        {trending === 'up'
                            ? `In precincts with more ${raceName} voters, the Dem candidate's average vote share climbs from ${(firstDem * 100).toFixed(0)}% → ${(lastDem * 100).toFixed(0)}%. This precinct-level trend is evidence of racial polarization and supports Gingles precondition #2 (minority political cohesion).`
                            : `In precincts with more ${raceName} voters, the Dem candidate's average vote share falls from ${(firstDem * 100).toFixed(0)}% → ${(lastDem * 100).toFixed(0)}%. This group votes with the majority — consistent with Gingles precondition #3 (majority bloc voting).`
                        }
                    </p>
                </div>
            )}

        </SurfacePanel>
    )
}
