/**
 * EnsembleAnalysisSection.jsx — Fourth section on StatePage (id="ensemble-analysis").
 *
 * LAYOUT
 *   ┌─────────────────────────────────────────────────────────────────────┐
 *   │  Ensemble Analysis          [Ensemble Splits] [Box & Whisker]       │
 *   ├─────────────────────────────────────────────────────────────────────┤
 *   │  Full-width tab content (swaps entire section body):               │
 *   │  · Ensemble Splits — Race-Blind + VRA-Constrained bar charts       │
 *   │  · Box & Whisker   — Race-Blind + VRA-Constrained box plots        │
 *   │                       Race selected via FeasibleRaceFilter sidebar  │
 *   └─────────────────────────────────────────────────────────────────────┘
 *
 * PROPS
 *   data    {object|null} — Full state bundle; uses splits + boxWhisker sub-keys.
 *
 * DATA SHAPE (data.splits)
 *   splitsData.enactedPlanSplit  — { republican, democratic } seat counts for the enacted plan.
 *   splitsData.ensembles[]       — Array with ensembleType 'race-blind' and 'vra-constrained'.
 *   splitsData.totalPlans        — Total number of sampled redistricting plans.
 *   splitsData.numDistricts      — Number of congressional districts in the state.
 *
 * DATA SHAPE (data.boxWhisker)
 *   bwData.feasibleGroups        — Array of lowercase race keys with box-whisker data.
 *   bwData.ensembles[]           — One entry per ensemble type.
 *   bwData.ensembles[].ensembleType      — 'race-blind' | 'vra-constrained'
 *   bwData.ensembles[].groupDistricts    — { [race]: [{ index, min, q1, median, mean, q3, max }] }
 *   bwData.enactedPlan.groupDistricts   — { [race]: [{ index, districtId, groupVapPercentage }] }
 *
 * STATE SOURCES (Zustand)
 *   activeEATab        — Active mini-nav tab; drives sidebar sub-nav highlight.
 *   feasibleRaceFilter — Selected race for box & whisker (FeasibleRaceFilter in sidebar).
 */

import { useMemo } from 'react'
import SectionHeader      from '@/components/ui/section-header'
import BrowserTabs        from '@/components/ui/browser-tabs'
import EnsembleSplitChart from '../charts/EnsembleSplitChart'
import BoxWhiskerChart    from '../charts/BoxWhiskerChart'
import useAppStore        from '../../store/useAppStore'
import { RACE_LABELS }    from '@/lib/partyColors'


/* ── Tab definitions ─────────────────────────────────────────────────────────
 * ids must match the EA_SUBSECTIONS ids in SectionPanel and the activeEATab
 * values in useAppStore so the sidebar sub-nav and pills stay in sync.
 * ─────────────────────────────────────────────────────────────────────────── */

const EA_TABS = [
    { id: 'ensemble-splits', label: 'Ensemble Splits' },
    { id: 'box-whisker',     label: 'Box & Whisker'   },
]


/**
 * EnsembleAnalysisSection — Tabbed ensemble splits + box & whisker section.
 *
 * The mini nav bar at the top swaps the entire section body between the two
 * sub-views. No scrolling between sub-sections; each view is self-contained.
 *
 * @param {{ data: object|null }} props
 * @returns {JSX.Element}
 */
export default function EnsembleAnalysisSection({ data }) {

    /* ── Tab state (global — mirrors sidebar sub-nav) ───────────────────── */
    const activeTab    = useAppStore(s => s.activeEATab)
    const setActiveTab = useAppStore(s => s.setActiveEATab)

    /* ── Race filter for box & whisker (shared with Gingles via Zustand) ── */
    const feasibleRaceFilter = useAppStore(s => s.feasibleRaceFilter)

    /* ── Derived data — Ensemble Splits ──────────────────────────────────── */
    const splitsData   = data?.splits ?? null
    const enactedSplit = splitsData?.enactedPlanSplit ?? null

    const raceBlind = splitsData?.ensembles?.find(e => e.ensembleType === 'race-blind')     ?? null
    const vraConstr = splitsData?.ensembles?.find(e => e.ensembleType === 'vra-constrained') ?? null

    /*
     * splitYMax — Highest plan frequency across both ensembles, padded by 10% and
     * rounded up to the nearest 100 so both charts share the same y-axis scale.
     */
    const splitYMax = useMemo(() => {
        const allFreqs = [raceBlind, vraConstr]
            .filter(Boolean)
            .flatMap(e => e.splits.map(s => s.frequency))
        if (!allFreqs.length) return undefined
        return Math.ceil(Math.max(...allFreqs) * 1.1 / 100) * 100
    }, [raceBlind, vraConstr])


    /* ── Derived data — Box & Whisker ────────────────────────────────────── */
    const bwData      = data?.boxWhisker ?? null
    const bwRaceBlind = bwData?.ensembles?.find(e => e.ensembleType === 'race-blind')     ?? null
    const bwVraConstr = bwData?.ensembles?.find(e => e.ensembleType === 'vra-constrained') ?? null

    /*
     * bwSharedYMax — Highest max value across both ensembles for the selected race,
     * padded 5% and snapped to the nearest 0.05 so both charts share the same y-axis.
     * Defaults to 1.0 if no data is available.
     */
    const bwSharedYMax = useMemo(() => {
        const race = feasibleRaceFilter
        const allMax = [bwRaceBlind, bwVraConstr]
            .filter(Boolean)
            .flatMap(e => (e.groupDistricts?.[race] ?? []).map(d => d.max))
        if (!allMax.length) return 1.0
        return Math.min(1.0, Math.ceil(Math.max(...allMax) * 1.05 / 0.05) * 0.05)
    }, [bwRaceBlind, bwVraConstr, feasibleRaceFilter])

    /* Human-readable race name for axis labels + legend */
    const raceName = RACE_LABELS[feasibleRaceFilter] ?? feasibleRaceFilter


    /* ── Render ──────────────────────────────────────────────────────────── */
    return (
        <section id="ensemble-analysis" className="p-2 sm:p-3 lg:p-4 border-b border-brand-muted/30 h-[calc(100vh-3.5rem)] flex flex-col overflow-hidden">

            {/* ── SECTION TITLE ──────────────────────────────────────────── */}
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-brand-darkest tracking-tight mb-3 shrink-0">
                Ensemble Analysis
            </h2>

            {/* ── BROWSER TABS + CONTENT PANEL ───────────────────────────── */}
            <BrowserTabs
                tabs={EA_TABS}
                activeTab={activeTab}
                onChange={setActiveTab}
                className="flex flex-col flex-1 min-h-0"
                panelClassName="flex-1 min-h-0 overflow-hidden p-5"
            >

                {/* ── ENSEMBLE SPLITS ────────────────────────────────────── */}
                {activeTab === 'ensemble-splits' && (
                    splitsData ? (
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 h-full">
                            <div className="flex flex-col gap-3 min-h-0">
                                <SectionHeader title="Race-Blind" />
                                <EnsembleSplitChart
                                    ensembleData={raceBlind}
                                    enactedSplit={enactedSplit}
                                    yMax={splitYMax}
                                    chartId="raceblind"
                                    className="flex-1 min-h-0"
                                />
                            </div>
                            <div className="flex flex-col gap-3 min-h-0">
                                <SectionHeader title="VRA-Constrained" />
                                <EnsembleSplitChart
                                    ensembleData={vraConstr}
                                    enactedSplit={enactedSplit}
                                    yMax={splitYMax}
                                    chartId="vra"
                                    className="flex-1 min-h-0"
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="rounded-xl border border-dashed border-brand-muted/30 bg-white/40 p-10 flex items-center justify-center min-h-[240px]">
                            <p className="text-brand-muted/50 text-sm italic">
                                Ensemble splits analysis not available for this state.
                            </p>
                        </div>
                    )
                )}

                {/* ── BOX & WHISKER ──────────────────────────────────────── */}
                {activeTab === 'box-whisker' && (
                    bwData ? (
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 h-full">
                            <div className="flex flex-col gap-3 min-h-0">
                                <SectionHeader title="Race-Blind" />
                                <BoxWhiskerChart
                                    districts={bwRaceBlind?.groupDistricts?.[feasibleRaceFilter] ?? []}
                                    enactedDistricts={bwData.enactedPlan?.groupDistricts?.[feasibleRaceFilter] ?? null}
                                    raceName={raceName}
                                    chartId="bw-raceblind"
                                    sharedYMax={bwSharedYMax}
                                    className="flex-1 min-h-0"
                                />
                            </div>
                            <div className="flex flex-col gap-3 min-h-0">
                                <SectionHeader title="VRA-Constrained" />
                                <BoxWhiskerChart
                                    districts={bwVraConstr?.groupDistricts?.[feasibleRaceFilter] ?? []}
                                    enactedDistricts={bwData.enactedPlan?.groupDistricts?.[feasibleRaceFilter] ?? null}
                                    raceName={raceName}
                                    chartId="bw-vra"
                                    sharedYMax={bwSharedYMax}
                                    className="flex-1 min-h-0"
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="rounded-xl border border-dashed border-brand-muted/30 bg-white/40 p-10 flex items-center justify-center min-h-[240px]">
                            <p className="text-brand-muted/50 text-sm italic">
                                Box &amp; whisker analysis not available for this state.
                            </p>
                        </div>
                    )
                )}

            </BrowserTabs>

        </section>
    )
}
