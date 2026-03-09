/**
 * useStateData.js — Reads the URL :stateId param, fetches the state overview
 * from the backend, syncs Zustand, and returns the overview bundle.
 *
 * Overview endpoint: GET /api/states/:stateId/overview
 * Returns: { stateSummary, districtSummary, ensembleSummary,
 *            availableHeatmapRaces, availableEiComparePairs }
 *
 * All other section data (heatmap, gingles, ei, ensemble, vote-seat-share)
 * is fetched on-demand inside each section component.
 *
 * @returns {{ stateId, data, loading, error }}
 *   data — overview bundle (stateSummary, districtSummary, ensembleSummary) or null
 */

import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import useAppStore from '@/store/useAppStore'
import { fetchOverview } from '../api'

export default function useStateData() {

    const { stateId } = useParams()
    const setSelectedState     = useAppStore(s => s.setSelectedState)
    const setDemographicGroups = useAppStore(s => s.setDemographicGroups)
    const setFeasibleRaceFilter = useAppStore(s => s.setFeasibleRaceFilter)

    const [data, setData]       = useState(null)
    const [loading, setLoading] = useState(false)
    const [error, setError]     = useState(null)

    useEffect(() => {
        if (!stateId) return
        setSelectedState(stateId)
        setData(null)
        setLoading(true)
        setError(null)

        fetchOverview(stateId)
            .then(overview => {
                setData(overview)

                const groups = overview.stateSummary?.demographicGroups ?? []
                setDemographicGroups(groups)

                const preferred =
                    groups.find(g => g.group.toLowerCase() === 'black'    && g.isFeasible) ??
                    groups.find(g => g.group.toLowerCase() === 'hispanic' && g.isFeasible) ??
                    groups.find(g => g.isFeasible)
                if (preferred) setFeasibleRaceFilter(preferred.group.toLowerCase())
            })
            .catch(err => {
                console.error('[useStateData] fetchOverview error:', err)
                setError(err.message)
            })
            .finally(() => setLoading(false))

    }, [stateId, setSelectedState, setDemographicGroups, setFeasibleRaceFilter])

    return { stateId, data, loading, error }
}
