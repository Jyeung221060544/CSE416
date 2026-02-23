/**
 * FeasibleRaceFilter.jsx — Single-select race filter for Gingles scatter + box-whisker.
 *
 * Only shows racial groups that meet the Gingles feasibility threshold (≥ 400k VAP).
 * Selecting a race updates feasibleRaceFilter in Zustand, which GinglesScatterPlot
 * reads to switch the active scatter series.
 *
 * PLACEMENT
 *   Shown in FilterPanel when:
 *     activeSection === 'racial-polarization' AND activeSubSection === 'gingles-analysis'
 *     OR
 *     activeSection === 'ensemble-analysis' AND activeSubSection === 'box-whisker'
 *
 * ========================================================================
 * TODO – Replace Dummy Data with Real Backend API
 * ========================================================================
 *
 * CURRENT IMPLEMENTATION
 *   FEASIBLE_RACES is hardcoded to Alabama's two groups (black, white) that
 *   meet the ≥ 400,000 VAP threshold.
 *
 * REQUIRED API CALL
 *   HTTP Method: GET
 *   Endpoint:    /api/states/:stateId  (already fetched by useStateData)
 *   Purpose:     stateSummary.demographicGroups contains isFeasible per group.
 *
 * INTEGRATION INSTRUCTIONS
 *   1. Accept demographicGroups as a prop (available in parent section components).
 *   2. Derive: demographicGroups.filter(g => g.isFeasible)
 *                               .map(g => ({ value: g.group.toLowerCase(), label: g.group }))
 *   3. Replace FEASIBLE_RACES with the derived array.
 *   4. Reset feasibleRaceFilter to the first feasible group on state change.
 *
 * SEARCHABLE MARKER
 *   //CONNECT HERE: FEASIBLE_RACES — derive from stateSummary.demographicGroups
 * ========================================================================
 *
 * STATE SOURCE
 *   feasibleRaceFilter / setFeasibleRaceFilter — from useFilters() (Zustand via useAppStore).
 */

import CollapsibleGroup from './CollapsibleGroup'
import useFilters from '../../hooks/useFilters'


/* ── Step 0: Hardcoded feasible race list (replace with API-derived data) ── */
//CONNECT HERE: FEASIBLE_RACES — replace this hardcoded array with
// demographicGroups.filter(g => g.isFeasible).map(g => ({ value: g.group.toLowerCase(), label: g.group }))
// (demographicGroups comes from GET /api/states/:stateId → stateSummary.demographicGroups)
const FEASIBLE_RACES = [
    { value: 'black', label: 'Black' },
    { value: 'white', label: 'White' },
]


/**
 * FeasibleRaceFilter — Single-select radio group for feasible-only race options.
 *
 * @returns {JSX.Element}
 */
export default function FeasibleRaceFilter() {

    /* ── Step 1: Read filter state from Zustand ──────────────────────────── */
    const { feasibleRaceFilter, setFeasibleRaceFilter } = useFilters()


    /* ── Step 2: Render ──────────────────────────────────────────────────── */
    return (
        <CollapsibleGroup label="Feasible Race / Ethnicity">
            {FEASIBLE_RACES.map((opt) => (
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
                Groups with ≥ 400k VAP
            </p>
        </CollapsibleGroup>
    )
}
