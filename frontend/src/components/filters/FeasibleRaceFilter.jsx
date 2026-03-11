/**
 * FeasibleRaceFilter.jsx — Dynamic race filter for Gingles scatter + box-whisker.
 *
 * Only shows racial groups that meet the Gingles feasibility threshold (≥ 400k VAP).
 * Derives the option list at render time from demographicGroups in Zustand, which is
 * populated by useStateData whenever the active state changes — so the filter
 * automatically reflects the correct feasible groups for each state (AL vs OR, etc.).
 *
 * PLACEMENT
 *   Shown in FilterPanel when:
 *     activeSection === 'racial-polarization' AND activeSubSection === 'gingles-analysis'
 *     OR
 *     activeSection === 'ensemble-analysis'   AND activeSubSection === 'box-whisker'
 *
 * ========================================================================
 * TODO — Replace Dummy Data with Real Backend API
 * ========================================================================
 *
 * CURRENT IMPLEMENTATION
 *   demographicGroups is written to Zustand by useStateData from the static
 *   DUMMY bundle.  The feasible list is derived here via .filter(isFeasible).
 *
 * REQUIRED API CALL
 *   HTTP Method: GET
 *   Endpoint:    /api/states/:stateId  (already fetched by useStateData)
 *   Purpose:     stateSummary.demographicGroups contains isFeasible per group.
 *
 * INTEGRATION STEPS
 *   No changes needed in this file — useStateData already calls
 *   setDemographicGroups() with the data bundle it receives.  Simply wire
 *   the real fetch in useStateData (see //CONNECT HERE marker there).
 *
 * SEARCHABLE MARKER
 *   //CONNECT HERE: see useStateData.js — demographicGroups flows via Zustand
 * ========================================================================
 *
 * STATE SOURCES
 *   demographicGroups          — from useAppStore (populated by useStateData on load).
 *   feasibleRaceFilter / setFeasibleRaceFilter — from useFilters() (Zustand via useAppStore).
 */

import useAppStore from '../../store/useAppStore'
import CollapsibleGroup from './CollapsibleGroup'
import useFilters from '../../hooks/useFilters'


/**
 * FeasibleRaceFilter — Single-select radio group for feasible-only race options.
 *
 * @returns {JSX.Element}
 */
export default function FeasibleRaceFilter() {

    /* ── Step 1: Read filter state and demographic groups from Zustand ───── */
    const { feasibleRaceFilter, setFeasibleRaceFilter } = useFilters()
    const demographicGroups = useAppStore(s => s.demographicGroups)

    /* ── Step 2: Derive feasible race options from the loaded state's data ── */
    // Groups where isFeasible === true are the only ones eligible for Gingles analysis.
    const feasibleRaces = demographicGroups
        .filter(g => g.isFeasible)
        .map(g => ({ value: g.group.toLowerCase(), label: g.group }))


    /* ── Step 3: Render ──────────────────────────────────────────────────── */
    return (
        <CollapsibleGroup label="Feasible Race / Ethnicity">
            {feasibleRaces.map((opt) => (
                <label key={opt.value} className="flex items-center gap-2 px-1 py-1 cursor-pointer">
                    {/* Custom-styled radio button */}
                    <input
                        type="radio"
                        name="feasibleRaceFilter"
                        value={opt.value}
                        checked={feasibleRaceFilter === opt.value}
                        onChange={() => setFeasibleRaceFilter(opt.value)}
                        className="appearance-none w-4 h-4 rounded-full border border-brand-primary checked:bg-brand-primary checked:border-brand-primary transition-colors shrink-0"
                    />
                    <span className="text-sm text-brand-surface">{opt.label}</span>
                </label>
            ))}

            {/* Feasibility threshold reminder */}
            <p className="text-[10px] text-white/70 px-1 pt-1 leading-snug">
                Gingles-eligible groups only
            </p>
        </CollapsibleGroup>
    )
}
