import useAppStore from '../store/useAppStore'

export default function useFilters() {

    const raceFilter         = useAppStore((state) => state.raceFilter)
    const setRaceFilter      = useAppStore((state) => state.setRaceFilter)

    const feasibleRaceFilter    = useAppStore((state) => state.feasibleRaceFilter)
    const setFeasibleRaceFilter = useAppStore((state) => state.setFeasibleRaceFilter)

    const ensembleFilter    = useAppStore((state) => state.ensembleFilter)
    const setEnsembleFilter = useAppStore((state) => state.setEnsembleFilter)

    const eiRaceFilter       = useAppStore((state) => state.eiRaceFilter)
    const toggleEiRaceFilter = useAppStore((state) => state.toggleEiRaceFilter)

    const resetFilters = useAppStore((state) => state.resetFilters)

    const showDistrictOverlay    = useAppStore((state) => state.showDistrictOverlay)
    const setShowDistrictOverlay = useAppStore((state) => state.setShowDistrictOverlay)

    const eaCompareMode    = useAppStore((state) => state.eaCompareMode)
    const setEaCompareMode = useAppStore((state) => state.setEaCompareMode)

    const effRaceFilter    = useAppStore((state) => state.effRaceFilter)
    const setEffRaceFilter = useAppStore((state) => state.setEffRaceFilter)

    const effBWRaceFilter       = useAppStore((state) => state.effBWRaceFilter)
    const toggleEffBWRaceFilter = useAppStore((state) => state.toggleEffBWRaceFilter)

    return {
        raceFilter,            setRaceFilter,
        feasibleRaceFilter,    setFeasibleRaceFilter,
        ensembleFilter,        setEnsembleFilter,
        eiRaceFilter,          toggleEiRaceFilter,
        showDistrictOverlay,   setShowDistrictOverlay,
        eaCompareMode,         setEaCompareMode,
        effRaceFilter,         setEffRaceFilter,
        effBWRaceFilter,       toggleEffBWRaceFilter,
        resetFilters,
    }
}
