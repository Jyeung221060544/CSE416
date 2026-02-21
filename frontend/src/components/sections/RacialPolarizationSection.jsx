import { useState, useEffect } from 'react'
import SectionHeader from '@/components/ui/section-header'
import useAppStore from '../../store/useAppStore'
import GinglesScatterPlot from '../charts/GinglesScatterPlot'
import GinglesPrecinctTable from '../tables/GinglesPrecinctTable'

export default function RacialPolarizationSection({ data, stateId }) {
    const raceFilter      = useAppStore(s => s.raceFilter)
    const ginglesPrecinct = data?.ginglesPrecinct ?? null
    const series          = ginglesPrecinct?.seriesByRace?.[raceFilter] ?? null

    const [selectedId, setSelectedId] = useState(null)

    // Reset selection when the user switches race filters
    useEffect(() => { setSelectedId(null) }, [raceFilter])

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
        <section id="racial-polarization" className="p-4 sm:p-6 lg:p-8 border-b border-brand-muted/30">

            {/* ── Section heading ── */}
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-brand-darkest tracking-tight">
                    Racial Polarization
                </h2>
                {stateId && (
                    <span className="text-xs text-brand-muted/60 font-medium tracking-wide hidden sm:block">
                        2024 precinct results
                    </span>
                )}
            </div>

            {/* ── Scatter plot (left) + Precinct detail table (right) ── */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

                <div className="flex flex-col gap-3">
                    <SectionHeader title="Gingles Scatter Plot" />
                    <GinglesScatterPlot
                        ginglesData={ginglesPrecinct}
                        raceFilter={raceFilter}
                        selectedId={selectedId}
                        onDotClick={setSelectedId}
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

        </section>
    )
}
