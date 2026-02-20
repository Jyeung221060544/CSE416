import { create } from 'zustand'

/** Important Notes on Zustand - Global State Management Library for React
 * 1. Used over React Context --> too much prop-drilling!
 * 2. Subscription Model
 *      --> React Context rerenders every consumer when any value in the context changes
 *      --> Zustand uses subscription-based model --> components can 'subscribe' to
 *          certain states --> only re-renders when these states changes
 * 3. Global Object
 *      --> Any component can read from or write to
 * 4. Usage Example
 *      --> import useAppStore from '../store/useAppStore'
 *      --> To read: const raceFilter = useAppStore((state) => state.raceFilter)
 *          --> In return(): return <div>Current race: {raceFilter}</div>
 *      --> To write: const setRaceFilter = useAppStore((state) => state.setRaceFilter)
 *          --> In return(): 
 *              <select value={raceFilter} onChange={(e) => setRaceFilter(e.target.value)}>
 *                  <option value="black">Black</option>
 *                  <option value="hispanic">Hispanic</option>
 *                  <option value="asian">Asian</option>
 *              </select>
 */
const useAppStore = create((set) => ({
    // Define States
    selectedState: null,
    activeSection: 'state-overview',
    raceFilter: 'black',
    granularityFilter: 'precinct',
    selectedDistrict: null,
    ensembleFilter: 'race_blind',
    darkMode: true,
    toggleDarkMode: () => set((state) => ({ darkMode: !state.darkMode })),

    // Define Actions
    setSelectedState: (state) => set({ selectedState: state }),
    setActiveSection: (section) => set({ activeSection: section }),
    setRaceFilter: (race) => set({ raceFilter: race }),
    setGranularityFilter: (g) => set({ granularityFilter: g }),
    setSelectedDistrict: (district) => set({ selectedDistrict: district }),
    setEnsembleFilter: (ensemble) => set({ ensembleFilter: ensemble }),
    resetFilters: () => set({
        raceFilter: 'black',
        granularityFilter: 'precinct',
        ensembleFilter: 'race_blind',
        selectedDistrict: null,
    }),
}))

export default useAppStore
