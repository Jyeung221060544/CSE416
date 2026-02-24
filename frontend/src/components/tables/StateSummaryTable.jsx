/**
 * @file StateSummaryTable.jsx
 * @description Read-only summary table of Voting Age Population (VAP) by racial
 *   or ethnic group for the splash/state-overview page. Unlike
 *   DemographicPopulationTable, rows are not clickable — this component is
 *   purely informational and does not update any race filter.
 *
 * PROPS
 * @prop {object} stateSummary - State summary object from useStateData:
 *   { demographicGroups: [{ group: string, vap: number,
 *                           vapPercentage: number, isFeasible: boolean }] }
 *
 * STATE SOURCES
 * - No local state. All data flows in via props.
 *
 * LAYOUT
 * - Rounded, bordered container (no <SurfacePanel> — uses raw div).
 * - Fixed four-column grid: Racial Group | VAP | VAP % | Gingles Feasible.
 * - Dark header; alternating row backgrounds via rowBg.
 * - "Feasible" / "Not Feasible" badges from FEASIBLE_CLS / NOT_FEASIBLE_CLS.
 */

/* ── Step 0: UI component and utility imports ─────────────────────────── */
import { Badge } from '@/components/ui/badge'
import { FEASIBLE_CLS, NOT_FEASIBLE_CLS } from '@/lib/partyColors'
import { ROW_BORDER, TABLE_HEADER, INACTIVE_LABEL, rowBg } from '@/lib/tableStyles'

/* ── Step 1: Main StateSummaryTable component ─────────────────────────── */
/**
 * Renders a non-interactive demographic summary table for the state overview.
 *
 * @param {object} props
 * @param {object} props.stateSummary - Contains the `demographicGroups` array.
 * @returns {JSX.Element|null} The summary table, or null if no data.
 */
export default function StateSummaryTable({ stateSummary }) {
    /* ── Step 1a: Guard — no data means nothing to render ── */
    if (!stateSummary) return null
    const { demographicGroups } = stateSummary

    /* ── Step 1b: Render ── */
    return (
        <div className="overflow-hidden rounded-xl border border-brand-muted/25 shadow-sm">

            {/* ── COLUMN HEADER ──────────────────────────────────────── */}
            {/* Header */}
            <div className={`grid grid-cols-[1fr_140px_100px_140px] gap-x-4 items-center px-5 py-2.5 ${TABLE_HEADER}`}>
                <span>Racial Group</span>
                <span className="text-right">Voting Age Pop.</span>
                <span className="text-right">VAP %</span>
                <span className="text-center">Gingles Feasible</span>
            </div>

            {/* ── DATA ROWS ──────────────────────────────────────────── */}
            {demographicGroups.map((g, i) => (
                <div
                    key={g.group}
                    className={`grid grid-cols-[1fr_140px_100px_140px] gap-x-4 items-center px-5 py-3 text-sm transition-colors ${ROW_BORDER} ${rowBg(i)}`}
                >
                    {/* Racial/ethnic group name */}
                    <span className={`font-bold text-sm ${INACTIVE_LABEL}`}>{g.group}</span>

                    {/* Voting age population count */}
                    <span className={`tabular-nums text-sm ${INACTIVE_LABEL} text-right`}>{g.vap.toLocaleString()}</span>

                    {/* VAP percentage */}
                    <span className={`tabular-nums text-sm ${INACTIVE_LABEL} text-right`}>{(g.vapPercentage * 100).toFixed(1)}%</span>

                    {/* Gingles feasibility badge */}
                    <div className="flex justify-center">
                        <Badge variant="outline" className={g.isFeasible ? FEASIBLE_CLS : NOT_FEASIBLE_CLS}>
                            {g.isFeasible ? 'Feasible' : 'Not Feasible'}
                        </Badge>
                    </div>
                </div>
            ))}
        </div>
    )
}
