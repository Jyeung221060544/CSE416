/**
 * EnsembleAnalysisSection.jsx — Fourth section on StatePage (id="ensemble-analysis").
 *
 * SUB-SECTIONS
 *   1. Ensemble Splits  (id="ensemble-splits")
 *      — Two side-by-side bar charts: Race-Blind ensemble vs VRA-Constrained ensemble.
 *      — Charts share a y-axis max so frequencies are visually comparable.
 *      — An enacted-plan split marker is overlaid on each chart.
 *
 *   2. Box & Whisker    (id="box-whisker")
 *      — Placeholder for the upcoming box & whisker plot visualization.
 *
 * PROPS
 *   data    {object|null} — Full state bundle; uses the splits sub-key.
 *   stateId {string}      — Two-letter abbreviation for the current state (e.g. 'AL').
 *
 * DATA SHAPE (data.splits)
 *   splitsData.enactedPlanSplit  — { republican, democratic } seat counts for the enacted plan.
 *   splitsData.ensembles[]       — Array with ensembleType 'race-blind' and 'vra-constrained'.
 *   splitsData.totalPlans        — Total number of sampled redistricting plans.
 *   splitsData.numDistricts      — Number of congressional districts in the state.
 */

import { useMemo } from 'react'
import SectionHeader    from '@/components/ui/section-header'
import EnsembleSplitChart from '../charts/EnsembleSplitChart'


/**
 * EnsembleAnalysisSection — Ensemble split charts and box & whisker (placeholder).
 *
 * @param {{ data: object|null, stateId: string }} props
 *   data    — Full state data bundle; reads data.splits.
 *   stateId — Two-letter abbreviation for the current state.
 * @returns {JSX.Element}
 */
export default function EnsembleAnalysisSection({ data, stateId }) {

    /* ── Step 0: Extract splits sub-keys ─────────────────────────────────── */
    const splitsData   = data?.splits ?? null
    const enactedSplit = splitsData?.enactedPlanSplit ?? null

    /* Find each ensemble type entry from the ensembles array */
    const raceBlind = splitsData?.ensembles?.find(e => e.ensembleType === 'race-blind') ?? null
    const vraConstr = splitsData?.ensembles?.find(e => e.ensembleType === 'vra-constrained') ?? null


    /* ── Step 1: Shared y-axis max ────────────────────────────────────────── */
    /*
     * splitYMax — Highest plan frequency across both ensembles, padded by 10% and
     * rounded up to the nearest 100 so both charts are on the same scale.
     * Returns undefined if neither ensemble has data, letting Nivo auto-scale.
     */
    const splitYMax = useMemo(() => {
        const allFreqs = [raceBlind, vraConstr]
            .filter(Boolean)
            .flatMap(e => e.splits.map(s => s.frequency))
        if (!allFreqs.length) return undefined
        return Math.ceil(Math.max(...allFreqs) * 1.1 / 100) * 100
    }, [raceBlind, vraConstr])


    /* ── Step 2: Render ──────────────────────────────────────────────────── */
    return (
        <section id="ensemble-analysis" className="border-b border-brand-muted/30">

            {/* ══════════════════════════════════════════════════════════════
                SUB-SECTION 1: ENSEMBLE SPLITS
                Race-blind and VRA-constrained bar charts side by side.
            ══════════════════════════════════════════════════════════════ */}
            <div id="ensemble-splits" className="p-4 sm:p-6 lg:p-8 border-b border-brand-muted/20">

                {/* ── SUB-SECTION HEADER ───────────────────────────────────── */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <p className="text-xs text-brand-muted/50 uppercase tracking-widest font-semibold mb-1">
                            Ensemble Analysis
                        </p>
                        <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-brand-darkest tracking-tight">
                            Ensemble Splits
                        </h2>
                    </div>

                    {/* Plan count metadata — hidden on small screens */}
                    {stateId && splitsData && (
                        <span className="text-xs text-brand-muted/60 font-medium tracking-wide hidden sm:block">
                            {splitsData.totalPlans?.toLocaleString() ?? '–'} sampled plans · {splitsData.numDistricts} districts
                        </span>
                    )}
                </div>

                {/* ── SPLIT CHARTS ─────────────────────────────────────────── */}
                {splitsData ? (
                    /* Two charts share enactedSplit marker and splitYMax for visual alignment */
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
                        <div className="flex flex-col gap-3">
                            <SectionHeader title="Race-Blind" />
                            <EnsembleSplitChart
                                ensembleData={raceBlind}
                                enactedSplit={enactedSplit}
                                yMax={splitYMax}
                                chartId="raceblind"
                                className="h-[360px]"
                            />
                        </div>
                        <div className="flex flex-col gap-3">
                            <SectionHeader title="VRA-Constrained" />
                            <EnsembleSplitChart
                                ensembleData={vraConstr}
                                enactedSplit={enactedSplit}
                                yMax={splitYMax}
                                chartId="vra"
                                className="h-[360px]"
                            />
                        </div>
                    </div>
                ) : (
                    /* ── NO DATA PLACEHOLDER ─────────────────────────────── */
                    <div className="rounded-xl border border-dashed border-brand-muted/30 bg-brand-surface/20 p-10 flex items-center justify-center min-h-[240px]">
                        <p className="text-brand-muted/50 text-sm italic">
                            Ensemble splits analysis not available for this state.
                        </p>
                    </div>
                )}

            </div>

            {/* ══════════════════════════════════════════════════════════════
                SUB-SECTION 2: BOX & WHISKER
                Placeholder — visualization not yet implemented.
            ══════════════════════════════════════════════════════════════ */}
            <div id="box-whisker" className="p-4 sm:p-6 lg:p-8">

                {/* ── SUB-SECTION HEADER ───────────────────────────────────── */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <p className="text-xs text-brand-muted/50 uppercase tracking-widest font-semibold mb-1">
                            Ensemble Analysis
                        </p>
                        <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-brand-darkest tracking-tight">
                            Box &amp; Whisker
                        </h2>
                    </div>
                </div>

                {/* ── COMING SOON PLACEHOLDER ──────────────────────────────── */}
                <div className="rounded-xl border border-dashed border-brand-muted/30 bg-brand-surface/20 p-10 flex items-center justify-center min-h-[240px]">
                    <p className="text-brand-muted/50 text-sm italic">
                        Box &amp; whisker analysis coming soon.
                    </p>
                </div>

            </div>

        </section>
    )
}
