/**
 * @file EnsembleSummaryTable.jsx
 * @description Summary table listing each ensemble (redistricting plan set) for
 *   the selected state. Displays ensemble type, total plan count, and population
 *   equality threshold. Used on the state Ensemble page to give users a quick
 *   overview before they inspect individual box-and-whisker charts.
 *
 * PROPS
 * @prop {object} ensembleSummary - Ensemble summary object from useStateData:
 *   { ensembles: [{ ensembleId, ensembleType, numPlans,
 *                   populationEqualityThreshold }] }
 *
 * STATE SOURCES
 * - No local state. All data flows in via props.
 *
 * LAYOUT
 * - <SurfacePanel> with horizontal scroll.
 * - Fixed three-column grid: Type | Plans | Threshold.
 * - Dark header row; alternating row backgrounds via rowBg.
 * - TYPE_META maps raw ensembleType keys to human-readable labels.
 */

/* ── Step 0: UI component and utility imports ─────────────────────────── */
import SurfacePanel from '@/components/ui/surface-panel'
import { ROW_BORDER, TABLE_HEADER, rowBg } from '@/lib/tableStyles'

/* ── Step 1: Ensemble type display-name lookup ────────────────────────── */
/**
 * Maps raw ensembleType strings to human-readable labels.
 * Falls back to the raw type string if not listed here.
 */
const TYPE_META = {
    'race-blind':      { label: 'Race-Blind' },
    'vra-constrained': { label: 'VRA-Constrained' },
}

/* ── Step 2: Main EnsembleSummaryTable component ─────────────────────── */
/**
 * Renders a three-column table summarizing all ensembles for the current state.
 *
 * @param {object} props
 * @param {object} props.ensembleSummary - Contains the `ensembles` array.
 * @returns {JSX.Element|null} The ensemble summary table, or null if no data.
 */
export default function EnsembleSummaryTable({ ensembleSummary }) {
    /* ── Step 2a: Guard — no data means nothing to render ── */
    if (!ensembleSummary) return null
    const { ensembles } = ensembleSummary

    /* ── Step 2b: Render ── */
    return (
        <SurfacePanel className="overflow-x-auto border-brand-muted/25">
            <div className="min-w-[280px]">

                {/* ── COLUMN HEADER ──────────────────────────────────── */}
                {/* Header */}
                <div className={`grid grid-cols-[1fr_80px_90px] items-center px-5 py-3 ${TABLE_HEADER}`}>
                    <span>Type</span>
                    <span className="text-center">Plans</span>
                    <span className="text-right">Threshold</span>
                </div>

                {/* ── DATA ROWS ──────────────────────────────────────── */}
                {/* Rows */}
                {ensembles.map((e, i) => {
                    /* Step 2b-i: Resolve display label and format threshold */
                    const meta = TYPE_META[e.ensembleType] ?? { label: e.ensembleType }
                    const threshold = e.populationEqualityThreshold != null
                        ? `±${(e.populationEqualityThreshold * 100).toFixed(0)}%`
                        : '—'

                    return (
                        <div
                            key={e.ensembleId}
                            className={[
                                'grid grid-cols-[1fr_80px_90px] items-center',
                                'px-5 py-3.5 transition-colors',
                                ROW_BORDER,
                                rowBg(i),
                            ].join(' ')}
                        >
                            {/* Ensemble type label */}
                            <span className="font-bold text-sm text-brand-deep">
                                {meta.label}
                            </span>

                            {/* Total plan count */}
                            <span className="text-center tabular-nums font-bold text-brand-deep text-sm">
                                {e.numPlans.toLocaleString()}
                            </span>

                            {/* Population equality threshold */}
                            <span className="text-right tabular-nums font-bold text-brand-deep text-sm">
                                {threshold}
                            </span>
                        </div>
                    )
                })}

            </div>
        </SurfacePanel>
    )
}
