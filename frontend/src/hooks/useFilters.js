import useAppStore from '../store/useAppStore'

export default function useFilters() {
    const raceFilter = useAppStore((state) => state.raceFilter)
    const setRaceFilter = useAppStore((state) => state.setRaceFilter)
    const feasibleRaceFilter = useAppStore((state) => state.feasibleRaceFilter)
    const setFeasibleRaceFilter = useAppStore((state) => state.setFeasibleRaceFilter)
    const granularityFilter = useAppStore((state) => state.granularityFilter)
    const setGranularityFilter = useAppStore((state) => state.setGranularityFilter)
    const ensembleFilter = useAppStore((state) => state.ensembleFilter)
    const setEnsembleFilter = useAppStore((state) => state.setEnsembleFilter)
    const eiRaceFilter = useAppStore((state) => state.eiRaceFilter)
    const toggleEiRaceFilter = useAppStore((state) => state.toggleEiRaceFilter)
    const resetFilters = useAppStore((state) => state.resetFilters)

    return {
        raceFilter, setRaceFilter,
        feasibleRaceFilter, setFeasibleRaceFilter,
        granularityFilter, setGranularityFilter,
        ensembleFilter, setEnsembleFilter,
        eiRaceFilter, toggleEiRaceFilter,
        resetFilters,
    }
}
