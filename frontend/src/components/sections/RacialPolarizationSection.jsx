import { useState, useEffect, useMemo } from 'react'
import SectionHeader from '@/components/ui/section-header'
import useAppStore from '../../store/useAppStore'
import GinglesScatterPlot from '../charts/GinglesScatterPlot'
import GinglesPrecinctTable from '../tables/GinglesPrecinctTable'
import EIKDEChart from '../charts/EIKDEChart'
import EIBarChart from '../charts/EIBarChart'

export default function RacialPolarizationSection({ data, stateId }) {
    const feasibleRaceFilter = useAppStore(s => s.feasibleRaceFilter)
    const eiRaceFilter       = useAppStore(s => s.eiRaceFilter)

    const ginglesPrecinct = data?.ginglesPrecinct ?? null
    const eiData          = data?.ei ?? null
    const series          = ginglesPrecinct?.feasibleSeriesByRace?.[feasibleRaceFilter] ?? null

    const [selectedId, setSelectedId] = useState(null)
    useEffect(() => { setSelectedId(null) }, [feasibleRaceFilter])

    // Find Dem / Rep candidate entries for EI
    const demCandidate = useMemo(
        () => eiData?.candidates?.find(c => c.party === 'Democratic') ?? null,
        [eiData]
    )
    const repCandidate = useMemo(
        () => eiData?.candidates?.find(c => c.party === 'Republican') ?? null,
        [eiData]
    )

    // Shared y-axis max across both charts + all selected races (keeps them synced)
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

    return (
        <section id="racial-polarization" className="border-b border-brand-muted/30">

            {/* ══════════════════════════════════════════════════════════
                Sub-section 1: Gingles Analysis
            ══════════════════════════════════════════════════════════ */}
            <div id="gingles-analysis" className="p-4 sm:p-6 lg:p-8 border-b border-brand-muted/20">

                {/* Section heading */}
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

                {/* Scatter (left) + Precinct table (right) */}
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

            {/* ══════════════════════════════════════════════════════════
                Sub-section 2: Ecological Inference  (GUI-12)
            ══════════════════════════════════════════════════════════ */}
            <div id="ecological-inference" className="p-4 sm:p-6 lg:p-8">

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

                {/* Two KDE charts side by side */}
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

                {/* GUI-13: Bar chart of peak EI estimates with CI */}
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
