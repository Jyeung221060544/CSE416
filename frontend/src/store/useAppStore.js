import { create } from 'zustand'

const useAppStore = create((set) => ({

    selectedState: null,
    activeSection: 'state-overview',
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

    setSelectedState: (state)    => set({ selectedState: state }),
    setActiveSection: (section)  => set({ activeSection: section }),
    setActiveSubSection: (sub)   => set({ activeSubSection: sub }),
    setActiveSOTab: (tab)        => set({ activeSOTab: tab }),
    setActiveRPTab: (tab)        => set({ activeRPTab: tab }),
    setActiveEATab: (tab)        => set({ activeEATab: tab }),
    setActiveEFFTab: (tab)       => set({ activeEFFTab: tab }),
    setRaceFilter: (race)        => set({ raceFilter: race }),
    setFeasibleRaceFilter: (race) => set({ feasibleRaceFilter: race }),
    setDemographicGroups: (groups) => set({ demographicGroups: groups }),
    setEiRaceFilter: (races) => set({ eiRaceFilter: races }),

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
    setEffRaceFilter: (race) => set({ effRaceFilter: race }),
    setEffBWRaceFilter: (races) => set({ effBWRaceFilter: races }),

    toggleEffBWRaceFilter: (race) => set((state) => {
        const current = state.effBWRaceFilter
        if (current.includes(race)) {
            if (current.length > 1) return { effBWRaceFilter: current.filter(r => r !== race) }
            return {}
        }
        return { effBWRaceFilter: [...current, race] }
    }),

    setSelectedDistrict: (district) => set({ selectedDistrict: district }),
    setEnsembleFilter: (ensemble) => set({ ensembleFilter: ensemble }),
    setEiKdeCompareRaces: (races) => set({ eiKdeCompareRaces: races }),

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
