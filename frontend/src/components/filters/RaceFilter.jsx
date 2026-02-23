/**
 * RaceFilter.jsx — Single-select race filter for the Demographic heatmap.
 *
 * Renders a radio group inside a CollapsibleGroup accordion.
 * Selecting a race updates raceFilter in Zustand, which DemographicHeatmap
 * and DemographicPopulationTable both subscribe to.
 *
 * PLACEMENT
 *   Shown in FilterPanel when activeSection === 'demographic'.
 *
 * STATE SOURCE
 *   raceFilter / setRaceFilter — from useFilters() (Zustand via useAppStore).
 */

import CollapsibleGroup from './CollapsibleGroup'
import useFilters from '../../hooks/useFilters'


/* ── Step 0: Race options ────────────────────────────────────────────────── */
/* Each value maps to a key in heatmapData.features and ginglesData series. */
const RACE_OPTIONS = [
    { value: 'white',    label: 'White' },
    { value: 'black',    label: 'Black' },
    { value: 'hispanic', label: 'Hispanic' },
    { value: 'asian',    label: 'Asian' },
    { value: 'other',    label: 'Other' },
]


/**
 * RaceFilter — Single-select radio group for the heatmap race layer.
 *
 * @returns {JSX.Element}
 */
export default function RaceFilter() {

    /* ── Step 1: Read filter state from Zustand ──────────────────────────── */
    const { raceFilter, setRaceFilter } = useFilters()


    /* ── Step 2: Render ──────────────────────────────────────────────────── */
    return (
        <CollapsibleGroup label="Race / Ethnicity">
            {RACE_OPTIONS.map((opt) => (
                <label key={opt.value} className="flex items-center gap-2 px-1 py-1 cursor-pointer">
                    {/* Custom-styled radio button — uses Tailwind appearance-none + checked: variants */}
                    <input
                        type="radio"
                        name="raceFilter"
                        value={opt.value}
                        checked={raceFilter === opt.value}
                        onChange={() => setRaceFilter(opt.value)}
                        className="appearance-none w-4 h-4 rounded-full border border-brand-primary checked:bg-brand-primary checked:border-brand-primary transition-colors shrink-0"
                    />
                    <span className="text-sm text-brand-surface">{opt.label}</span>
                </label>
            ))}
        </CollapsibleGroup>
    )
}
