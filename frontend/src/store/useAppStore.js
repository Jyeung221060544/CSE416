/**
 * useAppStore.js — Global application state via Zustand.
 *
 * WHY ZUSTAND OVER REACT CONTEXT
 *   React Context rerenders every consumer whenever any value changes.
 *   Zustand's subscription model only rerenders components that subscribe to
 *   the specific slice of state that changed — much more efficient for an app
 *   where many components share a few independent filter values.
 *
 * HOW TO READ FROM THE STORE (in any component)
 *   import useAppStore from '../store/useAppStore'
 *   const raceFilter = useAppStore((state) => state.raceFilter)
 *
 * HOW TO WRITE TO THE STORE (in any component)
 *   const setRaceFilter = useAppStore((state) => state.setRaceFilter)
 *   // then: setRaceFilter('hispanic')
 *
 * SHORTCUT — useFilters hook
 *   For components that need several filter values at once, prefer the
 *   useFilters() hook (hooks/useFilters.js) which bundles all filter
 *   state + setters in a single import.
 */

import { create } from 'zustand'


/* ── Step 0: Create the Zustand store ────────────────────────────────────────
 *
 *  `create` takes a factory function that receives `set` (the state updater)
 *  and returns an object containing both state values and action functions.
 *
 *  State values — plain JS values that components read and subscribe to.
 *  Action functions — call set() to produce a partial state update.
 * ─────────────────────────────────────────────────────────────────────────── */
const useAppStore = create((set) => ({

    /* ── Step 1: Navigation state ────────────────────────────────────────── */

    // Which state is currently loaded in StatePage (e.g. 'AL', 'OR', or null).
    // Set by useStateData when the URL param changes; read by Navbar badge.
    selectedState: null,

    // Which main section is currently in view in StatePage's scroll container.
    // Set by useActiveSection on scroll; drives sidebar nav highlight + FilterPanel.
    activeSection: 'state-overview',

    // Which sub-section is in view for sections that have them
    // (racial-polarization: 'gingles-analysis'|'ecological-inference',
    //  ensemble-analysis:   'ensemble-splits'|'box-whisker').
    activeSubSection: 'gingles-analysis',


    /* ── Step 2: Filter state ────────────────────────────────────────────── */

    // Selected race group for DemographicHeatmap and DemographicPopulationTable.
    // One of: 'white' | 'black' | 'hispanic' | 'asian' | 'other'
    raceFilter: 'black',

    // Selected race for GinglesScatterPlot and GinglesSummaryTable.
    // Only includes races that meet the >= 400k VAP threshold (isFeasible = true).
    feasibleRaceFilter: 'black',

    // Map granularity for DemographicHeatmap: 'precinct' | 'census_block'
    granularityFilter: 'precinct',

    // Currently highlighted district number (int) or null.
    // Set when user clicks a map polygon or a CongressionalTable row.
    selectedDistrict: null,

    // Which ensemble type to display: 'race_blind' | 'vra'
    ensembleFilter: 'race_blind',

    // Array of race keys to show on the EI KDE + bar charts.
    // Multi-select; always contains at least one item (enforced in toggleEiRaceFilter).
    eiRaceFilter: ['black'],


    /* ── Step 3: UI state ────────────────────────────────────────────────── */

    // Dark mode toggle (true = dark sidebar, false = light).
    // Stored in the global store so any component can read/write it.
    darkMode: true,

    /** Flips darkMode between true and false. */
    toggleDarkMode: () => set((state) => ({ darkMode: !state.darkMode })),


    /* ── Step 4: Action setters (one per state slice) ────────────────────── */

    /** @param {string|null} state  Two-letter state ID (e.g. 'AL') or null on home. */
    setSelectedState: (state)    => set({ selectedState: state }),

    /** @param {string} section  One of the SECTION_IDS in SectionPanel / useActiveSection. */
    setActiveSection: (section)  => set({ activeSection: section }),

    /** @param {string} sub  Sub-section id ('gingles-analysis', 'ecological-inference', etc.). */
    setActiveSubSection: (sub)   => set({ activeSubSection: sub }),

    /** @param {string} race  Lowercase race key: 'white'|'black'|'hispanic'|'asian'|'other'. */
    setRaceFilter: (race)        => set({ raceFilter: race }),

    /** @param {string} race  Same values as raceFilter, but limited to feasible groups. */
    setFeasibleRaceFilter: (race) => set({ feasibleRaceFilter: race }),

    /** @param {string} g  'precinct' or 'census_block'. */
    setGranularityFilter: (g)    => set({ granularityFilter: g }),

    /** @param {number|null} district  District number (int) or null to deselect. */
    setSelectedDistrict: (district) => set({ selectedDistrict: district }),

    /** @param {string} ensemble  'race_blind' or 'vra'. */
    setEnsembleFilter: (ensemble) => set({ ensembleFilter: ensemble }),


    /* ── Step 5: EI multi-select race toggle ─────────────────────────────── */

    /**
     * toggleEiRaceFilter — Adds or removes a race from the EI multi-select.
     *
     * Guards against removing the last item (at least one race must remain
     * visible in the EI KDE and bar charts).
     *
     * @param {string} race  Lowercase race key to toggle in eiRaceFilter.
     */
    toggleEiRaceFilter: (race) => set((state) => {
        const current = state.eiRaceFilter

        if (current.includes(race)) {
            // Guard: don't allow removing the last selected race
            if (current.length > 1) {
                return { eiRaceFilter: current.filter((r) => r !== race) }
            }
            return {}  // no-op — already at minimum
        }

        return { eiRaceFilter: [...current, race] }
    }),


    /* ── Step 6: Reset all filters to defaults ───────────────────────────── */

    /**
     * resetFilters — Resets all filter values to their initial defaults.
     *
     * Called by ResetFiltersButton and by Navbar's handleHome() when
     * the user navigates back to the home page.
     * Does NOT reset navigation state (selectedState, activeSection, etc.)
     * because those are driven by the URL, not by user filter choices.
     */
    resetFilters: () => set({
        raceFilter:         'black',
        feasibleRaceFilter: 'black',
        granularityFilter:  'precinct',
        ensembleFilter:     'race_blind',
        eiRaceFilter:       ['black'],
        selectedDistrict:   null,
    }),

}))

export default useAppStore
