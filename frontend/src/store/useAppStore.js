import { create } from 'zustand'

const useAppStore = create((set) => ({

    selectedState: null,
    activeSection: 'state-overview',
    // no longer actively used — sub-navigation is now tab-based
    activeSubSection: 'ensemble-splits',
    activeSOTab: 'state-stats',
    activeRPTab: 'gingles',
    activeEATab: 'ensemble-splits',
    activeEFFTab: 'effectiveness-visualizations',

    raceFilter: null,
    feasibleRaceFilter: null,
    selectedDistrict: null,
    ensembleFilter: 'race_blind',
    mapCompareFilter: ['current', 'low'],
    eiRaceFilter: [],
    eiKdeCompareRaces: [],
    demographicGroups: [],
    showDistrictOverlay: true,
    eaCompareMode: false,
    effRaceFilter: null,
    effBWRaceFilter: [],

    darkMode: true,
    toggleDarkMode: () => set((state) => ({ darkMode: !state.darkMode })),

    /** @param {string|null} state  Two-letter state ID (e.g. 'AL') or null on home. */
    setSelectedState: (state)    => set({ selectedState: state }),
    /** @param {string} section  One of the SECTION_IDS in SectionPanel / useActiveSection. */
    setActiveSection: (section)  => set({ activeSection: section }),
    setActiveSubSection: (sub)   => set({ activeSubSection: sub }),
    /** @param {string} tab  One of the OVERVIEW_TABS ids in StateOverviewSection. */
    setActiveSOTab: (tab)        => set({ activeSOTab: tab }),
    /** @param {string} tab  One of the RP_TABS ids in RacialPolarizationSection. */
    setActiveRPTab: (tab)        => set({ activeRPTab: tab }),
    /** @param {string} tab  One of the EA_TABS ids in EnsembleAnalysisSection. */
    setActiveEATab: (tab)        => set({ activeEATab: tab }),
    /** @param {string} tab  One of the EFF_TABS ids in EffectivenessSection. */
    setActiveEFFTab: (tab)       => set({ activeEFFTab: tab }),
    /** @param {string} race  Lowercase race key: 'white'|'black'|'latino'|'asian'|'other'. */
    setRaceFilter: (race)        => set({ raceFilter: race }),
    /** @param {string} race  Limited to feasible groups only. */
    setFeasibleRaceFilter: (race) => set({ feasibleRaceFilter: race }),
    setDemographicGroups: (groups) => set({ demographicGroups: groups }),
    /** @param {string[]} races  Array of lowercase race keys for EI multi-select. */
    setEiRaceFilter: (races) => set({ eiRaceFilter: races }),

    /**
     * Adds or removes a plan key from the comparison pair.
     * Guards: cannot remove the last selected plan (min 1), cannot add when 2 selected (max 2).
     * @param {string} plan  One of 'current' | 'high' | 'low'.
     */
    toggleMapCompareFilter: (plan) => set((state) => {
        const current = state.mapCompareFilter
        if (current.includes(plan)) {
            if (current.length <= 1) return {}
            return { mapCompareFilter: current.filter(p => p !== plan) }
        }
        if (current.length >= 2) return {}
        return { mapCompareFilter: [...current, plan] }
    }),

    setShowDistrictOverlay: (val) => set({ showDistrictOverlay: val }),
    setEaCompareMode: (val) => set({ eaCompareMode: val }),
    /** @param {string|null} race  Non-white feasible race key. */
    setEffRaceFilter: (race) => set({ effRaceFilter: race }),
    setEffBWRaceFilter: (races) => set({ effBWRaceFilter: races }),

    /**
     * Adds or removes a race from the EFF box-whisker multi-select.
     * Guards against removing the last selected race.
     * @param {string} race  Lowercase race key to toggle.
     */
    toggleEffBWRaceFilter: (race) => set((state) => {
        const current = state.effBWRaceFilter
        if (current.includes(race)) {
            if (current.length > 1) return { effBWRaceFilter: current.filter(r => r !== race) }
            return {}
        }
        return { effBWRaceFilter: [...current, race] }
    }),

    /** @param {number|null} district  District number (int) or null to deselect. */
    setSelectedDistrict: (district) => set({ selectedDistrict: district }),
    /** @param {string} ensemble  'race_blind' or 'vra'. */
    setEnsembleFilter: (ensemble) => set({ ensembleFilter: ensemble }),

    /**
     * Sets the exactly-2 race selection for the polarization KDE tab.
     * Caller is responsible for enforcing the 2-item constraint.
     * @param {string[]} races  Array of exactly 2 lowercase race keys.
     */
    setEiKdeCompareRaces: (races) => set({ eiKdeCompareRaces: races }),

    /**
     * Adds or removes a race from the EI multi-select.
     * Guards against removing the last item — at least one race must remain visible.
     * @param {string} race  Lowercase race key to toggle in eiRaceFilter.
     */
    toggleEiRaceFilter: (race) => set((state) => {
        const current = state.eiRaceFilter
        if (current.includes(race)) {
            if (current.length > 1) {
                return { eiRaceFilter: current.filter((r) => r !== race) }
            }
            return {}
        }
        return { eiRaceFilter: [...current, race] }
    }),

    /**
     * Resets all filter values to their initial defaults.
     * Does NOT reset navigation state (selectedState, activeSection, etc.) — those are
     * driven by the URL.
     */
    resetFilters: () => set((state) => {
        const groups = state.demographicGroups

        const primary =
            groups.find(g => g.group.toLowerCase() === 'black' && g.isFeasible)?.group.toLowerCase() ??
            groups.find(g => g.group.toLowerCase() === 'latino')?.group.toLowerCase() ??
            groups[0]?.group.toLowerCase() ?? null

        const preferredFeasible =
            groups.find(g => g.group.toLowerCase() === 'black'  && g.isFeasible)?.group.toLowerCase() ??
            groups.find(g => g.group.toLowerCase() === 'latino' && g.isFeasible)?.group.toLowerCase() ??
            groups.find(g => g.isFeasible)?.group.toLowerCase() ?? null

        const secondKey = primary && primary !== 'white'
            ? 'white'
            : groups.find(g => g.group.toLowerCase() !== primary)?.group.toLowerCase() ?? null

        const eiDefaults = primary && primary !== 'white'
            ? [primary, 'white']
            : (primary ? [primary] : [])

        const nonWhiteFeasible = groups
            .filter(g => g.isFeasible && g.group.toLowerCase() !== 'white')
            .map(g => g.group.toLowerCase())

        const preferredEffRace =
            groups.find(g => g.group.toLowerCase() === 'black'  && g.isFeasible)?.group.toLowerCase() ??
            groups.find(g => g.group.toLowerCase() === 'latino' && g.isFeasible)?.group.toLowerCase() ??
            nonWhiteFeasible[0] ?? null

        return {
            raceFilter:           primary,
            feasibleRaceFilter:   preferredFeasible,
            mapCompareFilter:     ['current', 'low'],
            ensembleFilter:       'race_blind',
            eiRaceFilter:         eiDefaults,
            eiKdeCompareRaces:    primary && secondKey ? [primary, secondKey] : [],
            selectedDistrict:     null,
            showDistrictOverlay:  true,
            eaCompareMode:        false,
            effRaceFilter:        preferredEffRace,
            effBWRaceFilter:      nonWhiteFeasible,
        }
    }),

}))

export default useAppStore
