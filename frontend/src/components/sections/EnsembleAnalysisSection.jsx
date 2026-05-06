import { useMemo, useEffect, useRef, useState } from 'react'
import SectionHeader             from '@/components/ui/section-header'
import BrowserTabs               from '@/components/ui/browser-tabs'
import EnsembleSplitChart        from '@/components/charts/EnsembleSplitChart'
import EnsembleSplitCompareChart from '@/components/charts/EnsembleSplitCompareChart'
import BoxWhiskerChart              from '@/components/charts/BoxWhiskerChart'
import BoxWhiskerCompareChart       from '@/components/charts/BoxWhiskerCompareChart'
import EffectivenessHistogram       from '@/components/charts/EffectivenessHistogram'
import useAppStore                  from '@/store/useAppStore'
import { fetchEnsembleSplits, fetchEnsembleBoxWhisker, fetchEnsembleMinorityDistricts } from '../../api'
import { RACE_LABELS }              from '@/lib/partyColors'

// ids must match the EA_SUBSECTIONS ids in SectionPanel and activeEATab in useAppStore
const EA_TABS = [
    { id: 'ensemble-splits',    label: 'Ensemble Splits'    },
    { id: 'box-whisker',        label: 'Box & Whisker'      },
    { id: 'minority-districts', label: 'Minority Districts' },
]

/**
 * Tabbed ensemble splits + box & whisker section.
 * The mini nav bar swaps the entire section body between the two sub-views.
 *
 * @param {{ data: object|null, stateId: string }} props
 */
export default function EnsembleAnalysisSection({ data, stateId }) {

    const activeTab          = useAppStore(s => s.activeEATab)
    const setActiveTab       = useAppStore(s => s.setActiveEATab)
    const eaCompareMode      = useAppStore(s => s.eaCompareMode)
    const setEaCompareMode   = useAppStore(s => s.setEaCompareMode)
    const feasibleRaceFilter = useAppStore(s => s.feasibleRaceFilter)
    const activeSection      = useAppStore(s => s.activeSection)

    const inEA = activeSection === 'ensemble-analysis'

    useEffect(() => { setEaCompareMode(false) }, [activeTab, setEaCompareMode])

    const [splitsData, setSplitsData] = useState(null)
    const hasSplitsFetched = useRef(false)

    const [bwData, setBwData] = useState(null)
    const hasBWFetched = useRef(false)

    const [effData, setEffData] = useState(null)
    const hasEffFetched = useRef(false)

    useEffect(() => {
        setSplitsData(null)
        setBwData(null)
        setEffData(null)
        hasSplitsFetched.current = false
        hasBWFetched.current = false
        hasEffFetched.current = false
    }, [stateId])

    useEffect(() => {
        if (!stateId || !inEA || activeTab !== 'ensemble-splits') return
        if (hasSplitsFetched.current) return
        hasSplitsFetched.current = true
        fetchEnsembleSplits(stateId)
            .then(setSplitsData)
            .catch(err => console.error('[Ensemble] fetchEnsembleSplits error:', err))
    }, [stateId, inEA, activeTab])

    useEffect(() => {
        if (!stateId || !inEA || activeTab !== 'box-whisker') return
        if (hasBWFetched.current) return
        hasBWFetched.current = true
        fetchEnsembleBoxWhisker(stateId)
            .then(setBwData)
            .catch(err => console.error('[Ensemble] fetchEnsembleBoxWhisker error:', err))
    }, [stateId, inEA, activeTab])

    useEffect(() => {
        if (!stateId || !inEA || activeTab !== 'minority-districts') return
        if (hasEffFetched.current) return
        hasEffFetched.current = true
        fetchEnsembleMinorityDistricts(stateId)
            .then(setEffData)
            .catch(err => console.error('[Ensemble] fetchEnsembleMinorityDistricts error:', err))
    }, [stateId, inEA, activeTab])


    const enactedSplit = splitsData?.enactedPlanSplit ?? null

    const raceBlind = splitsData?.ensembles?.find(e => e.ensembleType === 'race-blind')     ?? null
    const vraConstr = splitsData?.ensembles?.find(e => e.ensembleType === 'vra-constrained') ?? null

    /*
     * splitYMax — Highest plan frequency across both ensembles, padded 10% and
     * rounded up to the nearest 100 so both charts share the same y-axis scale.
     */
    const splitYMax = useMemo(() => {
        const allFreqs = [raceBlind, vraConstr]
            .filter(Boolean)
            .flatMap(e => e.splits.map(s => s.frequency))
        if (!allFreqs.length) return undefined
        return Math.ceil(Math.max(...allFreqs) * 1.1 / 100) * 100
    }, [raceBlind, vraConstr])

    /*
     * compareNivoData — Pre-merged rows for EnsembleSplitCompareChart (pure renderer).
     * Each row carries both frequencies + totals.
     * `?? 0` guards against missing r/d on extreme splits (0R-7D, 7R-0D).
     */
    const compareNivoData = useMemo(() => {
        if (!raceBlind || !vraConstr) return []
        const rbTotal  = raceBlind.splits.reduce((s, r) => s + r.frequency, 0)
        const vraTotal = vraConstr.splits.reduce((s, r) => s + r.frequency, 0)
        const enactedR = enactedSplit?.republican ?? null
        const map = {}
        const register = splits => splits.forEach(s => {
            const key = `${s.republican}R-${s.democratic}D`
            if (!map[key]) map[key] = { split: key, r: s.republican ?? 0, d: s.democratic ?? 0, raceBlind: 0, vra: 0 }
        })
        register(raceBlind.splits)
        register(vraConstr.splits)
        raceBlind.splits.forEach(s  => { map[`${s.republican}R-${s.democratic}D`].raceBlind = s.frequency })
        vraConstr.splits.forEach(s  => { map[`${s.republican}R-${s.democratic}D`].vra       = s.frequency })
        return Object.values(map)
            .filter(row => row.raceBlind > 0 || row.vra > 0 || row.r === enactedR)
            .sort((a, b) => a.r - b.r)
            .map(row => ({ ...row, rbTotal, vraTotal }))
    }, [raceBlind, vraConstr, enactedSplit])


    const bwRaceBlind = bwData?.ensembles?.find(e => e.ensembleType === 'race-blind')     ?? null
    const bwVraConstr = bwData?.ensembles?.find(e => e.ensembleType === 'vra-constrained') ?? null

    /*
     * bwSharedYMax — Highest max across both ensembles for the selected race,
     * padded 5% and snapped to the nearest 0.05 so both charts share the same y-axis.
     */
    const bwSharedYMax = useMemo(() => {
        const race = feasibleRaceFilter
        const allMax = [bwRaceBlind, bwVraConstr]
            .filter(Boolean)
            .flatMap(e => (e.groupDistricts?.[race] ?? []).map(d => d.max))
        if (!allMax.length) return 1.0
        return Math.min(1.0, Math.ceil(Math.max(...allMax) * 1.05 / 0.05) * 0.05)
    }, [bwRaceBlind, bwVraConstr, feasibleRaceFilter])

    const raceName = RACE_LABELS[feasibleRaceFilter] ?? feasibleRaceFilter

    // Normalize majorityMinorityHistogram into the same shape EffectivenessHistogram expects
    const mmHistNormalized = useMemo(() => {
        const mm = effData?.majorityMinorityHistogram  // from minority-districts endpoint
        if (!mm) return null
        return {
            enactedEffectiveByGroup: mm.enactedMMByGroup,
            ensembles: mm.ensembles.map(e => ({
                ...e,
                groupCounts: Object.fromEntries(
                    Object.entries(e.groupCounts).map(([race, counts]) => [
                        race,
                        counts.map(c => ({ numEffective: c.numMajorityMinority, frequency: c.frequency })),
                    ])
                ),
            })),
        }
    }, [effData])


    return (
        <section id="ensemble-analysis" className="p-2 sm:p-3 lg:p-4 border-b border-brand-muted/30 h-[calc(100vh-3.5rem)] flex flex-col overflow-hidden">

            <div className="flex items-baseline justify-between mb-3 shrink-0">
                <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-brand-darkest tracking-tight">
                    Ensemble Analysis
                </h2>
                <span className="hidden sm:inline-flex items-center gap-1.5 text-sm italic font-medium text-brand-primary bg-brand-primary/10 border border-brand-primary/20 px-3 py-0.5 rounded-full">&ldquo;Is the enacted plan fair?&rdquo;</span>
            </div>

            <BrowserTabs
                tabs={EA_TABS}
                activeTab={activeTab}
                onChange={setActiveTab}
                className="flex flex-col flex-1 min-h-0"
                panelClassName="flex-1 min-h-0 overflow-hidden p-5"
            >

                {activeTab === 'ensemble-splits' && (
                    splitsData ? (
                        eaCompareMode ? (
                            <div className="flex flex-col gap-3 h-full">
                                <SectionHeader title="Race-Blind vs VRA-Constrained" className="shrink-0" />
                                <EnsembleSplitCompareChart
                                    data={compareNivoData}
                                    enactedSplit={enactedSplit}
                                    yMax={splitYMax}
                                    className="flex-1 min-h-0"
                                />
                            </div>
                        ) : (
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
                        )
                    ) : (
                        <div className="rounded-xl border border-dashed border-brand-muted/30 bg-white/40 p-10 flex items-center justify-center min-h-[240px]">
                            <p className="text-brand-muted/50 text-sm italic">
                                Ensemble splits analysis not available for this state.
                            </p>
                        </div>
                    )
                )}

                {activeTab === 'box-whisker' && (
                    bwData ? (
                        eaCompareMode ? (
                            <div className="flex flex-col gap-3 h-full">
                                <SectionHeader title="Race-Blind vs VRA-Constrained" className="shrink-0" />
                                <BoxWhiskerCompareChart
                                    rbDistricts={bwRaceBlind?.groupDistricts?.[feasibleRaceFilter] ?? []}
                                    vraDistricts={bwVraConstr?.groupDistricts?.[feasibleRaceFilter] ?? []}
                                    enactedDistricts={bwData.enactedPlan?.groupDistricts?.[feasibleRaceFilter] ?? null}
                                    raceName={raceName}
                                    sharedYMax={bwSharedYMax}
                                    className="flex-1 min-h-0"
                                />
                            </div>
                        ) : (
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
                        )
                    ) : (
                        <div className="rounded-xl border border-dashed border-brand-muted/30 bg-white/40 p-10 flex items-center justify-center min-h-[240px]">
                            <p className="text-brand-muted/50 text-sm italic">
                                Box &amp; whisker analysis not available for this state.
                            </p>
                        </div>
                    )
                )}

                {activeTab === 'minority-districts' && (
                    effData ? (
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 h-full">
                            <div className="flex flex-col gap-1 min-w-0 h-full">
                                <SectionHeader title="Minority-Effective Districts" className="shrink-0" />
                                <EffectivenessHistogram
                                    data={effData.minorityEffectiveHistogram}
                                    raceKey={effData.feasibleGroups?.[0]}
                                    raceName={RACE_LABELS[effData.feasibleGroups?.[0]] ?? effData.feasibleGroups?.[0]}
                                    metricLabel="Effective"
                                    className="flex-1 min-h-0"
                                />
                            </div>
                            <div className="flex flex-col gap-1 min-w-0 h-full">
                                <SectionHeader title="Majority-Minority Districts" className="shrink-0" />
                                <EffectivenessHistogram
                                    data={mmHistNormalized}
                                    raceKey={effData.feasibleGroups?.[0]}
                                    raceName={RACE_LABELS[effData.feasibleGroups?.[0]] ?? effData.feasibleGroups?.[0]}
                                    metricLabel="Majority-Minority"
                                    className="flex-1 min-h-0"
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="rounded-xl border border-dashed border-brand-muted/30 bg-white/40 p-10 flex items-center justify-center min-h-[240px]">
                            <p className="text-brand-muted/50 text-sm italic">
                                Minority district data not available for this state.
                            </p>
                        </div>
                    )
                )}

            </BrowserTabs>

        </section>
    )
}
