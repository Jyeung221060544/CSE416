/**
 * useFilters.js — Convenience hook that bundles all filter state + setters.
 *
 * WHY THIS HOOK EXISTS
 * Filter components (RaceFilter, GranularityFilter, EIRaceFilter, etc.) each
 * need both the current value AND the setter from the Zustand store.
 * Subscribing to them one-by-one with multiple useAppStore() calls is verbose.
 * This hook collects all six filter slices in a single import so each filter
 * component only needs: const { raceFilter, setRaceFilter } = useFilters()
 *
 * SOURCE
 * All values and setters come from useAppStore (store/useAppStore.js).
 * See that file for the full state shape and action documentation.
 */

import useAppStore from '../store/useAppStore'


/**
 * useFilters — Returns all filter state values and their setters.
 *
 * @returns {{
 *   raceFilter:            string,
 *   setRaceFilter:         (race: string) => void,
 *   feasibleRaceFilter:    string,
 *   setFeasibleRaceFilter: (race: string) => void,
 *   granularityFilter:     string,
 *   setGranularityFilter:  (g: string) => void,
 *   ensembleFilter:        string,
 *   setEnsembleFilter:     (e: string) => void,
 *   eiRaceFilter:          string[],
 *   toggleEiRaceFilter:    (race: string) => void,
 *   resetFilters:          () => void,
 * }}
 *
 * CONSUMERS
 *   RaceFilter, FeasibleRaceFilter, EIRaceFilter, GranularityFilter,
 *   EnsembleFilter, ResetFiltersButton
 */
export default function useFilters() {

    /* ── Step 0: Subscribe to each filter slice individually ──────────────
     *  Each subscription is a separate selector so only the component that
     *  uses a specific value re-renders when that value changes.
     * ─────────────────────────────────────────────────────────────────── */

    // Heatmap / demographic race selection (RaceFilter)
    const raceFilter         = useAppStore((state) => state.raceFilter)
    const setRaceFilter      = useAppStore((state) => state.setRaceFilter)

    // Gingles scatter / box-whisker race selection (FeasibleRaceFilter)
    const feasibleRaceFilter    = useAppStore((state) => state.feasibleRaceFilter)
    const setFeasibleRaceFilter = useAppStore((state) => state.setFeasibleRaceFilter)

    // Heatmap granularity toggle (GranularityFilter)
    const granularityFilter    = useAppStore((state) => state.granularityFilter)
    const setGranularityFilter = useAppStore((state) => state.setGranularityFilter)

    // Ensemble type selection (EnsembleFilter)
    const ensembleFilter    = useAppStore((state) => state.ensembleFilter)
    const setEnsembleFilter = useAppStore((state) => state.setEnsembleFilter)

    // EI chart multi-select race array (EIRaceFilter)
    const eiRaceFilter       = useAppStore((state) => state.eiRaceFilter)
    const toggleEiRaceFilter = useAppStore((state) => state.toggleEiRaceFilter)

    // Global reset (ResetFiltersButton)
    const resetFilters = useAppStore((state) => state.resetFilters)

    /* ── Step 1: Return bundled object for destructuring at call site ───── */
    return {
        raceFilter,         setRaceFilter,
        feasibleRaceFilter, setFeasibleRaceFilter,
        granularityFilter,  setGranularityFilter,
        ensembleFilter,     setEnsembleFilter,
        eiRaceFilter,       toggleEiRaceFilter,
        resetFilters,
    }
}
