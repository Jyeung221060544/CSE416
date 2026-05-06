import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import useAppStore from '@/store/useAppStore'
import { fetchOverviewStateStats } from '../api'

export default function useStateData() {

    const { stateId } = useParams()
    const setSelectedState      = useAppStore(s => s.setSelectedState)
    const setDemographicGroups  = useAppStore(s => s.setDemographicGroups)
    const setFeasibleRaceFilter = useAppStore(s => s.setFeasibleRaceFilter)
    const setEiRaceFilter       = useAppStore(s => s.setEiRaceFilter)
    const setRaceFilter         = useAppStore(s => s.setRaceFilter)
    const setEiKdeCompareRaces  = useAppStore(s => s.setEiKdeCompareRaces)
    const setEffRaceFilter      = useAppStore(s => s.setEffRaceFilter)
    const setEffBWRaceFilter    = useAppStore(s => s.setEffBWRaceFilter)
    const setActiveSection      = useAppStore(s => s.setActiveSection)
    const setActiveSOTab        = useAppStore(s => s.setActiveSOTab)
    const setActiveRPTab        = useAppStore(s => s.setActiveRPTab)
    const setActiveEATab        = useAppStore(s => s.setActiveEATab)

    const [data, setData]       = useState(null)
    const [loading, setLoading] = useState(false)
    const [error, setError]     = useState(null)

    useEffect(() => {
        if (!stateId) return
        setSelectedState(stateId)
        setActiveSection('state-overview')
        setActiveSOTab('state-stats')
        setActiveRPTab('gingles')
        setActiveEATab('ensemble-splits')
        setData(null)
        setLoading(true)
        setError(null)

        fetchOverviewStateStats(stateId)
            .then(overview => {
                setData(overview)

                /* Normalize legacy "Hispanic" label → "Latino" for consistency.
                 * The backend may be seeded from data that uses "Hispanic"; all frontend
                 * logic and partyColors.js use "latino" / "Latino" as the canonical key. */
                const raw = overview.stateSummary?.demographicGroups ?? []
                const groups = raw.map(g =>
                    g.group.toLowerCase() === 'hispanic'
                        ? { ...g, group: 'Latino' }
                        : g
                )
                setDemographicGroups(groups)

                const preferred =
                    groups.find(g => g.group.toLowerCase() === 'black' && g.isFeasible) ??
                    groups.find(g => g.group.toLowerCase() === 'latino' && g.isFeasible) ??
                    groups.find(g => g.isFeasible)
                if (preferred) setFeasibleRaceFilter(preferred.group.toLowerCase())

                const primary =
                    groups.find(g => g.group.toLowerCase() === 'black' && g.isFeasible) ??
                    groups.find(g => g.group.toLowerCase() === 'latino') ??
                    groups[0]
                const primaryKey = primary?.group.toLowerCase()

                if (primaryKey) setRaceFilter(primaryKey)

                const whiteKey = 'white'
                const eiDefaults = primaryKey && primaryKey !== whiteKey
                    ? [primaryKey, whiteKey]
                    : (primaryKey ? [primaryKey] : [])
                if (eiDefaults.length) setEiRaceFilter(eiDefaults)

                const secondKey = primaryKey !== whiteKey
                    ? whiteKey
                    : groups.find(g => g.group.toLowerCase() !== primaryKey)?.group.toLowerCase()
                if (primaryKey && secondKey) setEiKdeCompareRaces([primaryKey, secondKey])

                const nonWhiteFeasible = groups
                    .filter(g => g.isFeasible && g.group.toLowerCase() !== whiteKey)
                    .map(g => g.group.toLowerCase())
                if (nonWhiteFeasible.length) {
                    setEffRaceFilter(nonWhiteFeasible[0])
                    setEffBWRaceFilter(nonWhiteFeasible)
                }
            })
            .catch(err => {
                console.error('[useStateData] fetchOverview error:', err)
                setError(err.message)
            })
            .finally(() => setLoading(false))

    }, [stateId, setSelectedState, setDemographicGroups, setFeasibleRaceFilter,
        setEiRaceFilter, setRaceFilter, setEiKdeCompareRaces,
        setEffRaceFilter, setEffBWRaceFilter,
        setActiveSection, setActiveSOTab, setActiveRPTab, setActiveEATab])

    return { stateId, data, loading, error }
}
