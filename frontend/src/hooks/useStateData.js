/**
 * ========================================================================
 * TODO – Replace Dummy Data with Real Backend API
 * ========================================================================
 *
 * CURRENT IMPLEMENTATION
 * - Imports 10 dummy JSON files for AL (stateSummary, districtSummary,
 *   ensembleSummary, splits, boxWhisker, ginglesCensus, ginglesPrecinct,
 *   ei, heatmapPrecinct, heatmapCensus) and 3 for OR from src/dummy/
 * - Bundles them into a static DUMMY lookup object keyed by stateId
 * - Returns the matching bundle synchronously (no loading/error states)
 *
 * REQUIRED API CALL
 * - HTTP Method: GET
 * - Endpoint:    /api/states/:stateId
 * - Purpose:     Returns the full data bundle for a given state (all sections)
 *
 * RESPONSE SNAPSHOT (keys only)
 * {
 *   stateSummary: {
 *     stateId, stateName, totalPopulation, votingAgePopulation,
 *     numDistricts, idealDistrictPopulation, isPreclearance,
 *     voterDistribution:            { electionYear, democraticVoteShare, republicanVoteShare },
 *     demographicGroups:            [{ group, vap, vapPercentage, isFeasible }],
 *     redistrictingControl:         { controllingParty },
 *     congressionalRepresentatives: { totalSeats, byParty: [{ party, seats }] }
 *   },
 *   districtSummary: {
 *     stateId, planType, electionYear,
 *     districts: [{ districtId, districtNumber, representative,
 *                   party, racialGroup, voteMarginPercentage, voteMarginDirection }]
 *   },
 *   ensembleSummary: {
 *     stateId,
 *     ensembles: [{ ensembleId, ensembleType, numPlans,
 *                   populationEqualityThreshold, description }]
 *   },
 *   splits: {
 *     stateId, numDistricts, totalPlans,
 *     enactedPlanSplit: { republican, democratic },
 *     ensembles: [{ ensembleId, ensembleType,
 *                   splits: [{ republican, democratic, frequency }] }]
 *   },
 *   boxWhisker: { ... } or null,
 *   ginglesPrecinct: {
 *     stateId,
 *     feasibleSeriesByRace: {
 *       [race]: {
 *         points: [{ id, name, x, y, totalPop, minorityPop,
 *                    avgHHIncome, regionType, demVotes, repVotes }],
 *         democraticTrendline:  [{ x, y }],
 *         republicanTrendline:  [{ x, y }],
 *         summaryRows: [{ rangeLabel, precinctCount,
 *                         avgDemocraticVoteShare, avgRepublicanVoteShare }]
 *       }
 *     }
 *   },
 *   ei: {
 *     stateId, electionYear,
 *     candidates: [{
 *       candidateId, candidateName, party,
 *       racialGroups: [{ group, peakSupportEstimate,
 *                        confidenceIntervalLow, confidenceIntervalHigh,
 *                        kdePoints: [{ x, y }] }]
 *     }]
 *   },
 *   heatmapPrecinct: {
 *     stateId, granularity,
 *     bins:     [{ binId, rangeMin, rangeMax, color }],
 *     features: [{ idx, black, white, hispanic, asian, other }]
 *   },
 *   heatmapCensus: { stateId, granularity, bins: [...], features: [...] }
 * }
 *
 * INTEGRATION INSTRUCTIONS
 * - Fetch inside useEffect whenever stateId changes
 * - Add useState: const [data, setData] = useState(null)
 * - Add useState: const [loading, setLoading] = useState(false)
 * - Add useState: const [error, setError] = useState(null)
 * - Replace the DUMMY[stateId] lookup with the fetch result
 * - Update return to: return { stateId, data, loading, error }
 *
 * SEARCHABLE MARKER
 * //CONNECT HERE: DUMMY lookup — replace all dummy imports + DUMMY object
 *
 * ========================================================================
 */

import { useEffect } from 'react'
import { useParams } from 'react-router-dom'
import useAppStore from '../store/useAppStore'

//CONNECT HERE: DUMMY lookup — delete all imports below + the DUMMY object,
// then fetch from GET /api/states/:stateId inside the useEffect instead
// ── Dummy data imports (DELETE when backend is ready) ────────────
import ALStateSummary    from '../dummy/AL-state-summary.json'
import ALDistrictSummary from '../dummy/AL-district-summary.json'
import ALEnsembleSummary from '../dummy/AL-ensemble-summary.json'
import ALSplits          from '../dummy/AL-splits.json'
import ALBoxWhisker      from '../dummy/AL-boxwhisker.json'
import ALGinglesCensus    from '../dummy/AL-Gingles-census.json'
import ALGinglesPrecinct  from '../dummy/AL-Gingles-precinct.json'
import ALEI               from '../dummy/AL-EI.json'
import ALHeatmapPrecinct  from '../dummy/AL-heatmap-precinct.json'
import ALHeatmapCensus    from '../dummy/AL-heatmap-census.json'

import ORStateSummary    from '../dummy/OR-state-summary.json'
import ORDistrictSummary from '../dummy/OR-district-summary.json'
import OREnrobleSummary  from '../dummy/OR-ensemble-summary.json'

// ── Lookup: stateId → all dummy data ────────────────────────────
const DUMMY = {
    AL: {
        stateSummary:    ALStateSummary,
        districtSummary: ALDistrictSummary,
        ensembleSummary: ALEnsembleSummary,
        splits:          ALSplits,
        boxWhisker:      ALBoxWhisker,
        ginglesCensus:    ALGinglesCensus,
        ginglesPrecinct:  ALGinglesPrecinct,
        ei:               ALEI,
        heatmapPrecinct:  ALHeatmapPrecinct,
        heatmapCensus:    ALHeatmapCensus,
    },
    OR: {
        stateSummary:    ORStateSummary,
        districtSummary: ORDistrictSummary,
        ensembleSummary: OREnrobleSummary,
        splits:          null,
        boxWhisker:      null,
        ginglesCensus:   null,
        ginglesPrecinct: null,
        ei:              null,
        heatmapPrecinct: null,
        heatmapCensus:   null,
    },
}

/**
 * Reads :stateId from the URL, syncs it into Zustand, and returns
 * the matching dummy data bundle. Drop-in replacement for the real
 * API once the backend is ready — just swap the DUMMY lookup for
 * an actual fetch inside the useEffect.
 */
export default function useStateData() {
    const { stateId } = useParams()
    const setSelectedState = useAppStore(s => s.setSelectedState)

    // Keep Zustand in sync so Navbar badge etc. reflect the URL
    useEffect(() => {
        if (stateId) setSelectedState(stateId)
    }, [stateId, setSelectedState])

    const data = stateId ? (DUMMY[stateId] ?? null) : null  //CONNECT HERE: replace DUMMY[stateId] with fetched API data

    return { stateId, data }
}
