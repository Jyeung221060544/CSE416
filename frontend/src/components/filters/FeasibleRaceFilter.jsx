/**
 * ========================================================================
 * TODO – Replace Dummy Data with Real Backend API
 * ========================================================================
 *
 * CURRENT IMPLEMENTATION
 * - FEASIBLE_RACES is hardcoded to Alabama's two groups (black, white) that
 *   meet the ≥ 400,000 VAP threshold
 * - No connection to actual per-state data; must be manually updated per state
 *
 * REQUIRED API CALL
 * - HTTP Method: GET
 * - Endpoint:    /api/states/:stateId  (already fetched by useStateData)
 * - Purpose:     stateSummary.demographicGroups contains isFeasible per group
 *
 * RESPONSE SNAPSHOT (keys only) — subset of stateSummary
 * {
 *   stateSummary: {
 *     demographicGroups: [{ group, vap, vapPercentage, isFeasible }]
 *   }
 * }
 *
 * INTEGRATION INSTRUCTIONS
 * - Accept demographicGroups as a prop (already available in parent sections)
 * - Derive feasible options: demographicGroups.filter(g => g.isFeasible)
 *                              .map(g => ({ value: g.group.toLowerCase(), label: g.group }))
 * - Replace the static FEASIBLE_RACES array with the derived list
 * - Also reset feasibleRaceFilter to the first feasible group on state change
 *
 * SEARCHABLE MARKER
 * //CONNECT HERE: FEASIBLE_RACES — derive from stateSummary.demographicGroups
 *
 * ========================================================================
 */

import CollapsibleGroup from './CollapsibleGroup'
import useFilters from '../../hooks/useFilters'

//CONNECT HERE: FEASIBLE_RACES — replace this hardcoded array with
// demographicGroups.filter(g => g.isFeasible).map(g => ({ value: g.group.toLowerCase(), label: g.group }))
// (demographicGroups comes from GET /api/states/:stateId → stateSummary.demographicGroups)
const FEASIBLE_RACES = [
    { value: 'black', label: 'Black' },
    { value: 'white', label: 'White' },
]

export default function FeasibleRaceFilter() {
    const { feasibleRaceFilter, setFeasibleRaceFilter } = useFilters()

    return (
        <CollapsibleGroup label="Feasible Race / Ethnicity">
            {FEASIBLE_RACES.map((opt) => (
                <label key={opt.value} className="flex items-center gap-2 px-1 py-1 cursor-pointer">
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
            <p className="text-[10px] text-white/70 px-1 pt-1 leading-snug">
                Groups with ≥ 400k VAP
            </p>
        </CollapsibleGroup>
    )
}
