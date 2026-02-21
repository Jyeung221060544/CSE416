import { useState, useEffect } from 'react'
import SectionHeader from '@/components/ui/section-header'
import useAppStore from '../../store/useAppStore'
import GinglesScatterPlot from '../charts/GinglesScatterPlot'
import GinglesPrecinctTable from '../tables/GinglesPrecinctTable'

export default function RacialPolarizationSection({ data, stateId }) {
    const feasibleRaceFilter = useAppStore(s => s.feasibleRaceFilter)
    const ginglesPrecinct    = data?.ginglesPrecinct ?? null
    const series             = ginglesPrecinct?.feasibleSeriesByRace?.[feasibleRaceFilter] ?? null

    const [selectedId, setSelectedId] = useState(null)
    useEffect(() => { setSelectedId(null) }, [feasibleRaceFilter])

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
                    {stateId && (
                        <span className="text-xs text-brand-muted/60 font-medium tracking-wide hidden sm:block">
                            2024 precinct results
                        </span>
                    )}
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
                Sub-section 2: Ecological Inference (placeholder)
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

                <div className="rounded-xl border border-dashed border-brand-muted/30 bg-brand-surface/20 p-10 flex items-center justify-center min-h-[240px]">
                    <p className="text-brand-muted/50 text-sm italic">
                        Ecological inference analysis coming soon.
                    </p>
                </div>

            </div>

        </section>
    )
}
