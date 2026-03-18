/**
 * DemographicSection.jsx — Second section on StatePage (id="demographic").
 *
 * Fetches heatmap data from: GET /api/states/:stateId/heatmap?granularity=&race=
 * Re-fetches whenever stateId, granularityFilter, or raceFilter changes.
 * Server returns one race at a time: { bins, features:[{idx, binId}] }
 */

import { useEffect, useRef, useState } from 'react'
import SectionHeader from '@/components/ui/section-header'
import SurfacePanel  from '@/components/ui/surface-panel'
import MapFrame      from '@/components/ui/map-frame'
import useAppStore                from '@/store/useAppStore'
import DemographicHeatmap         from '@/components/maps/DemographicHeatmap'
import DemographicPopulationTable from '@/components/tables/DemographicPopulationTable'
import { fetchHeatmap } from '../../api'


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


export default function DemographicSection({ data, stateId }) {

    const raceFilter          = useAppStore(s => s.raceFilter)
    const setRaceFilter       = useAppStore(s => s.setRaceFilter)
    const granularityFilter   = useAppStore(s => s.granularityFilter)
    const showDistrictOverlay = useAppStore(s => s.showDistrictOverlay)
    const activeSection       = useAppStore(s => s.activeSection)

    /* ── Fetch heatmap lazily — only once the Demographic section is active ─
     * hasActivated gates the very first fetch via the activation effect below.
     * After first activation, filter/state changes re-fetch via the second effect. */
    const [heatmapData, setHeatmapData] = useState(null)
    const hasActivated = useRef(false)

    useEffect(() => {
        hasActivated.current = false
        setHeatmapData(null)
    }, [stateId])

    // First-activation fetch: fires when user scrolls to demographic section.
    useEffect(() => {
        if (activeSection !== 'demographic') return
        if (hasActivated.current) return
        if (!stateId || !raceFilter) return
        hasActivated.current = true
        setHeatmapData(null)
        fetchHeatmap(stateId, granularityFilter, raceFilter)
            .then(setHeatmapData)
            .catch(err => console.error('[Demographic] fetchHeatmap error:', err))
    }, [activeSection, stateId, granularityFilter, raceFilter]) // eslint-disable-line react-hooks/exhaustive-deps

    // Re-fetch when filters change after initial activation.
    useEffect(() => {
        if (!stateId || !raceFilter) return
        if (!hasActivated.current) return
        setHeatmapData(null)
        fetchHeatmap(stateId, granularityFilter, raceFilter)
            .then(setHeatmapData)
            .catch(err => console.error('[Demographic] fetchHeatmap error:', err))
    }, [stateId, granularityFilter, raceFilter]) // eslint-disable-line react-hooks/exhaustive-deps

    /* ── Derived data from overview ──────────────────────────────────────── */
    const s               = data?.stateSummary
    const demographicGroups = s?.demographicGroups ?? []

    const districtPartyMap = {}
    ;(data?.districtSummary?.districts ?? []).forEach(d => {
        districtPartyMap[d.districtNumber] = d.party
    })

    /* ── Render ──────────────────────────────────────────────────────────── */
    return (
        <section id="demographic" className="p-2 sm:p-3 lg:p-4 border-b border-brand-muted/30 h-[calc(100vh-3.5rem)] flex flex-col overflow-hidden">

            <div className="flex items-baseline justify-between mb-6 shrink-0">
                <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-brand-darkest tracking-tight">
                    {s?.stateName && <span className="text-brand-primary">{s.stateName} — </span>}Demographic Analysis
                </h2>
                <span className="hidden sm:inline-flex items-center gap-1.5 text-sm italic font-medium text-brand-primary bg-brand-primary/10 border border-brand-primary/20 px-3 py-0.5 rounded-full">&ldquo;What does the minority landscape look like?&rdquo;</span>
            </div>

            <div className="flex-1 min-h-0 grid grid-cols-1 xl:grid-cols-2 gap-6">

                <div className="flex flex-col gap-1 min-h-0">
                    <SectionHeader title="Demographic Heat Map" />
                    <MapFrame className="flex-1 min-h-0">
                        <DemographicHeatmap
                            stateId={stateId}
                            granularity={granularityFilter}
                            heatmapData={heatmapData}
                            raceFilter={raceFilter}
                            mapView={s?.mapView}
                            showDistrictOverlay={showDistrictOverlay}
                            districtPartyMap={districtPartyMap}
                            isActive={activeSection === 'demographic'}
                        />
                    </MapFrame>
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
                        <DemographicPopulationTable
                            demographicGroups={demographicGroups}
                            raceFilter={raceFilter}
                            setRaceFilter={setRaceFilter}
                        />
                    </div>
                </div>

            </div>
        </section>
    )
}
