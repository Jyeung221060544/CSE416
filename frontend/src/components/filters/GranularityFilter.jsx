/**
 * GranularityFilter.jsx — Single-select granularity toggle for the Demographic heatmap.
 *
 * Switches the heatmap between two spatial resolutions:
 *   precinct      — voting precinct-level data (heatmapPrecinct)
 *   census_block  — census block-level data    (heatmapCensus)
 *
 * PLACEMENT
 *   Shown in FilterPanel when activeSection === 'demographic'.
 *
 * STATE SOURCE
 *   granularityFilter / setGranularityFilter — from useFilters() (Zustand via useAppStore).
 */

import CollapsibleGroup from './CollapsibleGroup'
import useFilters from '../../hooks/useFilters'


/* ── Step 0: Granularity options ─────────────────────────────────────────── */
/* Values match the granularity keys used to select heatmap data in DemographicSection */
const GRANULARITY_OPTIONS = [
    { value: 'precinct',     label: 'Precinct' },
    { value: 'census_block', label: 'Census Block' },
]


/**
 * GranularityFilter — Single-select radio group for heatmap spatial granularity.
 *
 * @returns {JSX.Element}
 */
export default function GranularityFilter() {

    /* ── Step 1: Read filter state from Zustand ──────────────────────────── */
    const { granularityFilter, setGranularityFilter } = useFilters()


    /* ── Step 2: Render ──────────────────────────────────────────────────── */
    return (
        <CollapsibleGroup label="Granularity">
            {GRANULARITY_OPTIONS.map((opt) => (
                <label key={opt.value} className="flex items-center gap-2 px-1 py-1 cursor-pointer">
                    {/* Custom-styled radio button */}
                    <input
                        type="radio"
                        name="granularityFilter"
                        value={opt.value}
                        checked={granularityFilter === opt.value}
                        onChange={() => setGranularityFilter(opt.value)}
                        className="appearance-none w-4 h-4 rounded-full border border-brand-primary checked:bg-brand-primary checked:border-brand-primary transition-colors shrink-0"
                    />
                    <span className="text-sm text-brand-surface">{opt.label}</span>
                </label>
            ))}
        </CollapsibleGroup>
    )
}
