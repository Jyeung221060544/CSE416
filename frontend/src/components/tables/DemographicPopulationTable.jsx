/**
 * @file DemographicPopulationTable.jsx
 * @description Table displaying Voting Age Population (VAP) statistics by racial
 *   or ethnic group for a state. Clicking a row sets the active `raceFilter`,
 *   which drives the demographic heatmap color scheme and Gingles analysis.
 *
 * PROPS
 * @prop {Array}    demographicGroups - Array of group objects:
 *   { group: string, vap: number, vapPercentage: number, isFeasible: boolean }
 * @prop {string}   raceFilter        - Currently active race group key
 *   (lowercase, e.g. "black"). Used to highlight the matching row.
 * @prop {Function} setRaceFilter     - Callback to update the active race filter.
 * @prop {boolean}  [fillHeight=false]- If true, the panel expands to fill its
 *   parent container height.
 *
 * STATE SOURCES
 * - raceFilter / setRaceFilter : Lifted state from the parent page component.
 *
 * LAYOUT
 * - <SurfacePanel> wrapping a <table> with responsive overflow.
 * - Columns: Group | VAP | % VAP | Opportunity (feasibility badge).
 * - Dark header; alternating row backgrounds; active row highlighted.
 * - "Feasible" / "Not Feasible" badges from FEASIBLE_CLS / NOT_FEASIBLE_CLS.
 */

/* ── Step 0: UI component and utility imports ─────────────────────────── */
import { Badge } from '@/components/ui/badge'
import SurfacePanel from '@/components/ui/surface-panel'
import { cn } from '@/lib/utils'
import { FEASIBLE_CLS, NOT_FEASIBLE_CLS } from '@/lib/partyColors'
import { ROW_BORDER, ACTIVE_LABEL, INACTIVE_LABEL, rowBg } from '@/lib/tableStyles'

/* ── Step 1: Group key normalizer ────────────────────────────────────── */
/**
 * Converts a display group name to the lowercase key used by raceFilter.
 * @param {string} g - Display name (e.g. "Black").
 * @returns {string} Lowercase key (e.g. "black").
 */
function groupKey(g) { return g.toLowerCase() }

/* ── Step 2: Main DemographicPopulationTable component ───────────────── */
/**
 * Renders the VAP demographic breakdown table with clickable rows that
 * update the global race filter for the heatmap and Gingles views.
 *
 * @param {object}   props
 * @param {Array}    props.demographicGroups - Per-group VAP data.
 * @param {string}   props.raceFilter        - Currently selected group key.
 * @param {Function} props.setRaceFilter     - Setter for the race filter.
 * @param {boolean}  [props.fillHeight]      - Expand panel to fill parent height.
 * @returns {JSX.Element|JSX.Element} Table panel, or italic "no data" text.
 */
export default function DemographicPopulationTable({ demographicGroups, raceFilter, setRaceFilter, fillHeight = false, readOnly = false }) {
    /* ── Step 2a: Guard — no data means nothing to render ── */
    if (!demographicGroups?.length) {
        return <p className="text-brand-muted/50 text-sm italic">No demographic data available.</p>
    }

    /* ── Step 2b: Render ── */
    return (
        <SurfacePanel className={cn('overflow-auto border-brand-muted/20', fillHeight && 'h-full')}>
            <table className="w-full text-sm border-collapse">

                {/* ── COLUMN HEADER ──────────────────────────────────── */}
                <thead>
                    <tr className="bg-brand-darkest text-brand-surface text-sm font-semibold">
                        <th className="px-4 py-3 text-left font-bold">Group</th>
                        <th className="px-4 py-3 text-right font-bold">VAP</th>
                        <th className="px-4 py-3 text-right font-bold">% VAP</th>
                        <th className="px-4 py-3 text-center font-bold">Opportunity</th>
                    </tr>
                </thead>

                {/* ── DATA ROWS ──────────────────────────────────────── */}
                <tbody>
                    {demographicGroups.map((row, i) => {
                        /* Step 2b-i: Derive row key and active state */
                        const key = groupKey(row.group)
                        const isActive = raceFilter === key

                        return (
                            <tr
                                key={row.group}
                                onClick={readOnly ? undefined : () => setRaceFilter(key)}
                                className={[
                                    ROW_BORDER, 'transition-colors',
                                    !readOnly && 'cursor-pointer',
                                    rowBg(i, !readOnly && isActive),
                                ].join(' ')}
                            >
                                {/* Group name — highlighted when active */}
                                <td className="px-4 py-3">
                                    <span className={`font-bold text-sm ${!readOnly && isActive ? ACTIVE_LABEL : INACTIVE_LABEL}`}>
                                        {row.group}
                                    </span>
                                </td>

                                {/* Voting age population count */}
                                <td className="px-4 py-3 text-right tabular-nums text-brand-darkest font-medium">
                                    {row.vap?.toLocaleString() ?? '-'}
                                </td>

                                {/* VAP percentage — highlighted when active */}
                                <td className="px-4 py-3 text-right">
                                    <span className={`tabular-nums font-bold text-base ${!readOnly && isActive ? ACTIVE_LABEL : INACTIVE_LABEL}`}>
                                        {row.vapPercentage != null ? `${(row.vapPercentage * 100).toFixed(1)}%` : '-'}
                                    </span>
                                </td>

                                {/* Gingles feasibility badge */}
                                <td className="px-4 py-3 text-center">
                                    {row.isFeasible
                                        ? <Badge className={FEASIBLE_CLS}>Feasible</Badge>
                                        : <Badge className={NOT_FEASIBLE_CLS}>Not Feasible</Badge>
                                    }
                                </td>
                            </tr>
                        )
                    })}
                </tbody>
            </table>
        </SurfacePanel>
    )
}
