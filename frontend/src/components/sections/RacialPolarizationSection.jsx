/**
 * RacialPolarizationSection.jsx — Third section on StatePage (id="racial-polarization").
 *
 * SUB-SECTIONS
 *   1. Gingles Analysis     (id="gingles-analysis")
 *      — Scatter plot of precinct minority VAP % vs Dem vote share, with trendlines.
 *      — Click a dot to highlight the corresponding row in the precinct table.
 *
 *   2. Ecological Inference (id="ecological-inference")
 *      — Two KDE charts (Democratic + Republican support by race), sharing a y-axis.
 *      — Bar chart of peak support estimates with confidence intervals.
 *
 * PROPS
 *   data    {object|null} — Full state bundle; uses ginglesPrecinct and ei sub-keys.
 *   stateId {string}      — Two-letter abbreviation for the current state (e.g. 'AL').
 *
 * STATE SOURCES (Zustand)
 *   feasibleRaceFilter — Selected race for the Gingles scatter series.
 *   eiRaceFilter       — Array of races shown as KDE overlay lines in EI charts.
 *
 * NOTE
 *   Currently data is only available for Alabama (stateId === 'AL').
 *   All other states show a placeholder message.
 */

import { useState, useEffect, useMemo } from 'react'
import SectionHeader   from '@/components/ui/section-header'
import useAppStore     from '../../store/useAppStore'
import GinglesScatterPlot  from '../charts/GinglesScatterPlot'
import GinglesPrecinctTable from '../tables/GinglesPrecinctTable'
import EIKDEChart      from '../charts/EIKDEChart'
import EIBarChart      from '../charts/EIBarChart'


/**
 * RacialPolarizationSection — Gingles + Ecological Inference sub-sections.
 *
 * @param {{ data: object|null, stateId: string }} props
 *   data    — Full state data bundle (ginglesPrecinct, ei).
 *   stateId — Two-letter abbreviation for the current state.
 * @returns {JSX.Element}
 */
export default function RacialPolarizationSection({ data, stateId }) {

    /* ── Step 0: Zustand filter state ────────────────────────────────────── */
    const feasibleRaceFilter = useAppStore(s => s.feasibleRaceFilter)
    const eiRaceFilter       = useAppStore(s => s.eiRaceFilter)


    /* ── Step 1: Derived data ────────────────────────────────────────────── */

    /* Gingles data — the active race series from the precinct scatter dataset */
    const ginglesPrecinct = data?.ginglesPrecinct ?? null
    const eiData          = data?.ei ?? null
    const series          = ginglesPrecinct?.feasibleSeriesByRace?.[feasibleRaceFilter] ?? null

    /* selectedId — dot/row selection kept in local state (not global, only this section cares) */
    const [selectedId, setSelectedId] = useState(null)

    /* Reset selection whenever the race filter changes so no stale dot is highlighted */
    useEffect(() => { setSelectedId(null) }, [feasibleRaceFilter])

    /* Find Democratic / Republican candidate entries from the EI dataset */
    const demCandidate = useMemo(
        () => eiData?.candidates?.find(c => c.party === 'Democratic') ?? null,
        [eiData]
    )
    const repCandidate = useMemo(
        () => eiData?.candidates?.find(c => c.party === 'Republican') ?? null,
        [eiData]
    )

    /*
     * eiYMax — Shared y-axis maximum for both KDE charts so they stay on the same scale.
     * Computed from the highest KDE density point across all selected races and both candidates.
     * Adds 10% headroom and rounds to 1 decimal place.
     */
    const eiYMax = useMemo(() => {
        if (!eiData) return 10
        let max = 0
        eiData.candidates.forEach(candidate => {
            candidate.racialGroups.forEach(group => {
                if (!eiRaceFilter.includes(group.group.toLowerCase())) return
                group.kdePoints.forEach(pt => { if (pt.y > max) max = pt.y })
            })
        })
        return Math.ceil(max * 1.1 * 10) / 10
    }, [eiData, eiRaceFilter])


    /* ── Step 2: AL-only guard ───────────────────────────────────────────── */
    /* Show placeholder for any state that doesn't yet have polarization data */
    if (stateId !== 'AL') {
        return (
            <section id="racial-polarization" className="p-4 sm:p-6 lg:p-8 border-b border-brand-muted/30">
                <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-brand-darkest tracking-tight mb-4">
                    Racial Polarization
                </h2>
                <p className="text-brand-muted/70">Racial polarization mock data is currently configured for Alabama only.</p>
            </section>
        )
    }


    /* ── Step 3: Render ──────────────────────────────────────────────────── */
    return (
        <section id="racial-polarization" className="border-b border-brand-muted/30">

            {/* ══════════════════════════════════════════════════════════════
                SUB-SECTION 1: GINGLES ANALYSIS
                Scatter plot + precinct data table with dot↔row sync selection.
            ══════════════════════════════════════════════════════════════ */}
            <div id="gingles-analysis" className="p-4 sm:p-6 lg:p-8 border-b border-brand-muted/20">

                {/* ── SUB-SECTION HEADER ───────────────────────────────────── */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <p className="text-xs text-brand-muted/50 uppercase tracking-widest font-semibold mb-1">
                            Racial Polarization
                        </p>
                        <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-brand-darkest tracking-tight">
                            Gingles Analysis
                        </h2>
                    </div>
                </div>

                {/* ── SCATTER + TABLE GRID ─────────────────────────────────── */}
                {/* Click a dot → highlights the precinct row; click row → highlights dot */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">

                    <div className="flex flex-col gap-3">
                        <SectionHeader title="Gingles Scatter Plot" />
                        <GinglesScatterPlot
                            ginglesData={ginglesPrecinct}
                            raceFilter={feasibleRaceFilter}
                            selectedId={selectedId}
                            onDotClick={setSelectedId}
                            className="h-[480px]"
                        />
                    </div>

                    <div className="flex flex-col gap-3">
                        <SectionHeader title="Precinct Detail" />
                        <GinglesPrecinctTable
                            points={series?.points ?? []}
                            selectedId={selectedId}
                            onSelectId={setSelectedId}
                        />
                    </div>

                </div>
            </div>

            {/* ══════════════════════════════════════════════════════════════
                SUB-SECTION 2: ECOLOGICAL INFERENCE
                Dual KDE charts (shared y-axis) + peak-support bar chart.
            ══════════════════════════════════════════════════════════════ */}
            <div id="ecological-inference" className="p-4 sm:p-6 lg:p-8">

                {/* ── SUB-SECTION HEADER ───────────────────────────────────── */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <p className="text-xs text-brand-muted/50 uppercase tracking-widest font-semibold mb-1">
                            Racial Polarization
                        </p>
                        <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-brand-darkest tracking-tight">
                            Ecological Inference
                        </h2>
                    </div>
                </div>

                {/* ── KDE CHARTS ───────────────────────────────────────────── */}
                {/* Both charts use eiYMax so their y-axes stay aligned */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
                    <div className="flex flex-col gap-3">
                        <SectionHeader title="Democratic Support" />
                        <EIKDEChart
                            candidate={demCandidate}
                            activeRaces={eiRaceFilter}
                            yMax={eiYMax}
                            className="h-[400px]"
                        />
                    </div>
                    <div className="flex flex-col gap-3">
                        <SectionHeader title="Republican Support" />
                        <EIKDEChart
                            candidate={repCandidate}
                            activeRaces={eiRaceFilter}
                            yMax={eiYMax}
                            className="h-[400px]"
                        />
                    </div>
                </div>

                {/* ── PEAK SUPPORT BAR CHART ───────────────────────────────── */}
                {/* Shows peak KDE estimate with confidence interval error bars per race */}
                <div className="flex flex-col gap-3 mt-6">
                    <SectionHeader title="Peak Support Estimates" />
                    <EIBarChart
                        demCandidate={demCandidate}
                        repCandidate={repCandidate}
                        activeRaces={eiRaceFilter}
                        className="h-[420px]"
                    />
                </div>

            </div>

        </section>
    )
}
