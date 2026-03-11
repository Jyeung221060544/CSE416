/**
 * useStateData.js — Reads the URL :stateId param, fetches the state overview
 * from the backend, syncs Zustand, and returns the overview bundle.
 *
 * Overview endpoint: GET /api/states/:stateId/overview/state-stats
 * Returns: { stateSummary, districtSummary }
 *
 * All other section data (heatmap, gingles, ei, ensemble, vote-seat-share)
 * is fetched on-demand inside each section component.
 *
 * @returns {{ stateId, data, loading, error }}
 *   data — state-stats bundle (stateSummary, districtSummary) or null
 */

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

    const [data, setData]       = useState(null)
    const [loading, setLoading] = useState(false)
    const [error, setError]     = useState(null)

    useEffect(() => {
        if (!stateId) return
        setSelectedState(stateId)
        setData(null)
        setLoading(true)
        setError(null)

        fetchOverviewStateStats(stateId)
            .then(overview => {
                setData(overview)

                const groups = overview.stateSummary?.demographicGroups ?? []
                setDemographicGroups(groups)

                // Feasible race filter: black > hispanic > any feasible
                const preferred =
                    groups.find(g => g.group.toLowerCase() === 'black'    && g.isFeasible) ??
                    groups.find(g => g.group.toLowerCase() === 'hispanic' && g.isFeasible) ??
                    groups.find(g => g.isFeasible)
                if (preferred) setFeasibleRaceFilter(preferred.group.toLowerCase())

                // Primary race: black (if feasible) > hispanic > first group
                const primary =
                    groups.find(g => g.group.toLowerCase() === 'black' && g.isFeasible) ??
                    groups.find(g => g.group.toLowerCase() === 'hispanic') ??
                    groups[0]
                const primaryKey = primary?.group.toLowerCase()

                // raceFilter (demographic heatmap) — derived from state data
                if (primaryKey) setRaceFilter(primaryKey)

                // EI race filter — single default race
                if (primaryKey) setEiRaceFilter([primaryKey])

                // EI KDE compare races: [primary, white] — white if primary isn't white,
                // otherwise pick the next available group
                const whiteKey = 'white'
                const secondKey = primaryKey !== whiteKey
                    ? whiteKey
                    : groups.find(g => g.group.toLowerCase() !== primaryKey)?.group.toLowerCase()
                if (primaryKey && secondKey) setEiKdeCompareRaces([primaryKey, secondKey])
            })
            .catch(err => {
                console.error('[useStateData] fetchOverview error:', err)
                setError(err.message)
            })
            .finally(() => setLoading(false))

    }, [stateId, setSelectedState, setDemographicGroups, setFeasibleRaceFilter,
        setEiRaceFilter, setRaceFilter, setEiKdeCompareRaces])

    return { stateId, data, loading, error }
}
