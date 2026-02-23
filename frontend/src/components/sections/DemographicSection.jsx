/**
 * DemographicSection.jsx — Second section on StatePage (id="demographic").
 *
 * LAYOUT
 *   ┌────────────────────────────────┬────────────────────────────────┐
 *   │  DemographicHeatmap            │  DemographicPopulationTable    │
 *   │  (Leaflet choropleth map)      │  (race group VAP breakdown)    │
 *   ├────────────────────────────────┤                                │
 *   │  Active filter pills           │                                │
 *   ├────────────────────────────────┤                                │
 *   │  HeatmapLegend (color bins)    │  Opportunity district callout  │
 *   └────────────────────────────────┴────────────────────────────────┘
 *
 * PROPS
 *   data    {object|null} — Full state bundle from useStateData; uses heatmapPrecinct
 *                           and heatmapCensus sub-keys.
 *   stateId {string}      — Two-letter state abbreviation (e.g. 'AL').
 *
 * STATE SOURCES (Zustand)
 *   raceFilter        — Selected racial group for heatmap layer and table highlight.
 *   setRaceFilter     — Setter for raceFilter.
 *   granularityFilter — 'precinct' or 'census_block'; switches the heatmap dataset.
 */

import SectionHeader from '@/components/ui/section-header'
import SurfacePanel  from '@/components/ui/surface-panel'
import MapFrame      from '@/components/ui/map-frame'
import InfoCallout   from '@/components/ui/info-callout'
import { Lightbulb } from 'lucide-react'
import useAppStore          from '../../store/useAppStore'
import DemographicHeatmap   from '../maps/DemographicHeatmap'
import DemographicPopulationTable from '../tables/DemographicPopulationTable'


/* ── Step 0: Sub-components ──────────────────────────────────────────────── */

/**
 * HeatmapLegend — Color-coded bin key for the DemographicHeatmap.
 *
 * Reads the bins array from the active heatmap dataset and renders a swatch
 * grid showing the % minority VAP range each color represents.
 *
 * @param {{ bins: Array<{ binId: string, rangeMin: number, rangeMax: number, color: string }>|null }} props
 *   bins — Bin definitions from heatmapData.bins.  Returns null if the array is empty.
 * @returns {JSX.Element|null}
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
                        {/* Color swatch — background set from bin.color (hex string) */}
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


/* ── Step 1: Main exported section component ─────────────────────────────── */

/**
 * DemographicSection — Heatmap + population table for the selected state.
 *
 * @param {{ data: object|null, stateId: string }} props
 *   data    — Full state data bundle; reads heatmapCensus / heatmapPrecinct.
 *   stateId — Two-letter abbreviation for the current state (e.g. 'AL').
 * @returns {JSX.Element}
 */
export default function DemographicSection({ data, stateId }) {

    /* ── Step 2: Zustand filter state ────────────────────────────────────── */
    const raceFilter        = useAppStore(s => s.raceFilter)
    const setRaceFilter     = useAppStore(s => s.setRaceFilter)
    const granularityFilter = useAppStore(s => s.granularityFilter)


    /* ── Step 3: Derived data ────────────────────────────────────────────── */
    const s               = data?.stateSummary
    const demographicGroups = s?.demographicGroups ?? []

    /* Select the correct heatmap dataset based on the granularity filter toggle */
    const heatmapData = granularityFilter === 'census_block'
        ? (data?.heatmapCensus ?? null)
        : (data?.heatmapPrecinct ?? null)

    /* Human-readable label for the active granularity */
    const granularityLabel = granularityFilter === 'census_block' ? 'Census Block' : 'Precinct'


    /* ── Step 4: Render ──────────────────────────────────────────────────── */
    return (
        <section id="demographic" className="p-4 sm:p-6 lg:p-8 border-b border-brand-muted/30">

            {/* ── SECTION HEADER ───────────────────────────────────────────── */}
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-brand-darkest tracking-tight">
                    Demographic Analysis
                </h2>
            </div>

            {/* ── TWO-COLUMN GRID ──────────────────────────────────────────── */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

                {/* ── LEFT: HEATMAP COLUMN ─────────────────────────────────── */}
                <div className="flex flex-col gap-3">
                    <SectionHeader title="Demographic Heat Map" />

                    {/* Leaflet choropleth map — colored by minority VAP bin */}
                    <MapFrame className="h-[340px] sm:h-[400px] xl:h-[420px]">
                        <DemographicHeatmap
                            stateId={stateId}
                            granularity={granularityFilter}
                            heatmapData={heatmapData}
                            raceFilter={raceFilter}
                        />
                    </MapFrame>

                    {/* Active filter indicator pills */}
                    <div className="flex items-center gap-2 text-xs text-brand-muted/70">
                        <span className="font-semibold text-brand-deep">Showing:</span>
                        <span className="px-2 py-0.5 rounded-md bg-teal-500/10 text-teal-700 font-semibold capitalize">
                            {raceFilter}
                        </span>
                        <span className="font-semibold text-brand-deep ml-2">Granularity:</span>
                        <span className="px-2 py-0.5 rounded-md bg-brand-muted/15 text-brand-deep font-semibold">
                            {granularityLabel}
                        </span>
                    </div>

                    {/* ── HEATMAP LEGEND ───────────────────────────────────── */}
                    {/* Shown when heatmapData is available; fallback message if not */}
                    {heatmapData
                        ? <HeatmapLegend bins={heatmapData.bins} />
                        : stateId && (
                            <p className="text-xs text-brand-muted/60 italic">
                                Heatmap data not yet available for this state.
                            </p>
                        )
                    }
                </div>

                {/* ── RIGHT: POPULATION TABLE COLUMN ───────────────────────── */}
                <div className="flex flex-col gap-4">
                    <SectionHeader title="Population by Group" />

                    <div className="flex flex-col h-[340px] sm:h-[400px] xl:h-[420px]">

                        {/* Table with click-to-filter behavior (updates raceFilter) */}
                        <DemographicPopulationTable
                            demographicGroups={demographicGroups}
                            raceFilter={raceFilter}
                            setRaceFilter={setRaceFilter}
                        />

                        {/* ── FEASIBILITY CALLOUT ──────────────────────────── */}
                        {/* Explains the "Feasible" badge in the population table */}
                        <InfoCallout icon={Lightbulb} className="mt-auto">
                            <span className="font-semibold text-brand-deep">Opportunity district:</span> Feasible
                            indicates the group&apos;s VAP is greater than or equal to 400,000, which may support a
                            majority-minority district under the Gingles preconditions.
                        </InfoCallout>
                    </div>
                </div>

            </div>
        </section>
    )
}
