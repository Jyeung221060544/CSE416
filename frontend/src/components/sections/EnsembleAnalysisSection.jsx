import { useMemo } from 'react'
import SectionHeader from '@/components/ui/section-header'
import EnsembleSplitChart from '../charts/EnsembleSplitChart'

export default function EnsembleAnalysisSection({ data, stateId }) {
    const splitsData   = data?.splits ?? null
    const enactedSplit = splitsData?.enactedPlanSplit ?? null

    const raceBlind = splitsData?.ensembles?.find(e => e.ensembleType === 'race-blind') ?? null
    const vraConstr = splitsData?.ensembles?.find(e => e.ensembleType === 'vra-constrained') ?? null

    // Shared Y-axis max so both charts are on the same scale
    const splitYMax = useMemo(() => {
        const allFreqs = [raceBlind, vraConstr]
            .filter(Boolean)
            .flatMap(e => e.splits.map(s => s.frequency))
        if (!allFreqs.length) return undefined
        return Math.ceil(Math.max(...allFreqs) * 1.1 / 100) * 100
    }, [raceBlind, vraConstr])

    return (
        <section id="ensemble-analysis" className="border-b border-brand-muted/30">

            {/* ══════════════════════════════════════════════════════════
                Sub-section 1: Ensemble Splits
            ══════════════════════════════════════════════════════════ */}
            <div id="ensemble-splits" className="p-4 sm:p-6 lg:p-8 border-b border-brand-muted/20">

                <div className="flex items-center justify-between mb-6">
                    <div>
                        <p className="text-xs text-brand-muted/50 uppercase tracking-widest font-semibold mb-1">
                            Ensemble Analysis
                        </p>
                        <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-brand-darkest tracking-tight">
                            Ensemble Splits
                        </h2>
                    </div>
                    {stateId && splitsData && (
                        <span className="text-xs text-brand-muted/60 font-medium tracking-wide hidden sm:block">
                            {splitsData.totalPlans?.toLocaleString() ?? '–'} sampled plans · {splitsData.numDistricts} districts
                        </span>
                    )}
                </div>

                {splitsData ? (
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
                    <div className="rounded-xl border border-dashed border-brand-muted/30 bg-brand-surface/20 p-10 flex items-center justify-center min-h-[240px]">
                        <p className="text-brand-muted/50 text-sm italic">
                            Ensemble splits analysis not available for this state.
                        </p>
                    </div>
                )}

            </div>

            {/* ══════════════════════════════════════════════════════════
                Sub-section 2: Box & Whisker
            ══════════════════════════════════════════════════════════ */}
            <div id="box-whisker" className="p-4 sm:p-6 lg:p-8">

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

                <div className="rounded-xl border border-dashed border-brand-muted/30 bg-brand-surface/20 p-10 flex items-center justify-center min-h-[240px]">
                    <p className="text-brand-muted/50 text-sm italic">
                        Box &amp; whisker analysis coming soon.
                    </p>
                </div>

            </div>

        </section>
    )
}
