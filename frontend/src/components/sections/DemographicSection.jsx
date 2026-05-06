import { useEffect, useRef, useState } from 'react'
import SectionHeader from '@/components/ui/section-header'
import SurfacePanel  from '@/components/ui/surface-panel'
import MapFrame      from '@/components/ui/map-frame'
import useAppStore                from '@/store/useAppStore'
import DemographicHeatmap         from '@/components/maps/DemographicHeatmap'
import DemographicPopulationTable from '@/components/tables/DemographicPopulationTable'
import { fetchHeatmap } from '../../api'

/**
 * Color-coded legend for the demographic heatmap bins.
 * @param {Array<{binId: string, color: string, rangeMin: number, rangeMax: number}>} bins - Bin definitions from heatmap data.
 */
function HeatmapLegend({ bins }) {
    if (!bins?.length) return null
    return (
        <SurfacePanel className="p-3 border-brand-muted/20 bg-white">
            <p className="text-[10px] font-bold uppercase tracking-widest text-brand-deep mb-2">
                Legend - % Minority VAP per unit
            </p>
            <div className="grid grid-cols-5 gap-x-3 gap-y-2">
                {bins.map(bin => (
                    <div key={bin.binId} className="flex items-center gap-1.5">
                        <span
                            className="w-4 h-4 rounded-sm border border-black/15 shrink-0"
                            style={{ backgroundColor: bin.color }}
                        />
                        <span className="text-xs font-semibold text-brand-darkest tabular-nums">
                            {bin.rangeMin}-{bin.rangeMax}%
                        </span>
                    </div>
                ))}
            </div>
        </SurfacePanel>
    )
}

/**
 * Renders the Demographic Analysis section with a precinct-level heatmap
 * and a population breakdown table by racial group.
 * @param {object} data - State overview data containing stateSummary and districtSummary.
 * @param {string} stateId - State identifier used to fetch heatmap data.
 */
export default function DemographicSection({ data, stateId }) {

    const raceFilter          = useAppStore(s => s.raceFilter)
    const setRaceFilter       = useAppStore(s => s.setRaceFilter)
    const showDistrictOverlay = useAppStore(s => s.showDistrictOverlay)
    const activeSection       = useAppStore(s => s.activeSection)

    const [heatmapData, setHeatmapData] = useState(null)
    const hasActivated = useRef(false)

    // Step 0: Reset heatmap when state changes
    useEffect(() => {
        hasActivated.current = false
        setHeatmapData(null)
    }, [stateId])

    // Step 1: Fetch heatmap on first activation of this section
    useEffect(() => {
        if (activeSection !== 'demographic') return
        if (hasActivated.current) return
        if (!stateId || !raceFilter) return
        hasActivated.current = true
        setHeatmapData(null)
        fetchHeatmap(stateId, raceFilter)
            .then(setHeatmapData)
            .catch(err => console.error('[Demographic] fetchHeatmap error:', err))
    }, [activeSection, stateId, raceFilter])

    // Step 2: Re-fetch heatmap when race filter changes after activation
    useEffect(() => {
        if (!stateId || !raceFilter) return
        if (!hasActivated.current) return
        setHeatmapData(null)
        fetchHeatmap(stateId, raceFilter)
            .then(setHeatmapData)
            .catch(err => console.error('[Demographic] fetchHeatmap error:', err))
    }, [stateId, raceFilter])

    const s               = data?.stateSummary
    const demographicGroups = s?.demographicGroups ?? []

    // Step 3: Build district → party lookup for overlay coloring
    const districtPartyMap = {}
    ;(data?.districtSummary?.districts ?? []).forEach(d => {
        districtPartyMap[d.districtNumber] = d.party
    })

    // Step 4: Render heatmap (left) and population table (right)
    return (
        <section id="demographic" className="p-2 sm:p-3 lg:p-4 border-b border-brand-muted/30 h-[calc(100vh-3.5rem)] flex flex-col overflow-hidden">

            <div className="flex items-baseline justify-between mb-4 shrink-0">
                <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-brand-darkest tracking-tight">
                    Demographic Analysis
                </h2>
                <span className="hidden sm:inline-flex items-center gap-1.5 text-sm italic font-medium text-brand-primary bg-brand-primary/10 border border-brand-primary/20 px-3 py-0.5 rounded-full">&ldquo;What does the minority landscape look like?&rdquo;</span>
            </div>

            <div className="flex-1 min-h-0 grid grid-cols-1 xl:grid-cols-2 gap-6">

                <div className="flex flex-col gap-1 min-h-0">
                    <SectionHeader title="Demographic Heat Map" />
                    <MapFrame className="flex-1 min-h-0">
                        {/* Demographic Heatmap */}
                        <DemographicHeatmap
                            stateId={stateId}
                            heatmapData={heatmapData}
                            raceFilter={raceFilter}
                            mapView={s?.mapView}
                            showDistrictOverlay={showDistrictOverlay}
                            districtPartyMap={districtPartyMap}
                            isActive={activeSection === 'demographic'}
                        />
                    </MapFrame>
                    {/* Heatmap Legend */}
                    {heatmapData
                        ? <HeatmapLegend bins={heatmapData.bins} />
                        : stateId && (
                            <p className="text-xs text-brand-muted/60 italic">
                                {raceFilter ? 'Loading heatmap…' : 'Heatmap data not yet available for this state.'}
                            </p>
                        )
                    }
                </div>

                <div className="flex flex-col gap-1 min-h-0">
                    <SectionHeader title="Population by Group" />
                    <div className="flex flex-col flex-1 min-h-0">
                        {/* Demographic Population Table */}
                        <DemographicPopulationTable
                            demographicGroups={demographicGroups}
                            raceFilter={raceFilter}
                            setRaceFilter={setRaceFilter}
                            districtSummary={data?.districtSummary}
                            numDistricts={s?.numDistricts}
                        />
                    </div>
                </div>

            </div>
        </section>
    )
}
