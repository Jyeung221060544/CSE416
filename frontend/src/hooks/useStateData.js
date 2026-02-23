/**
 * useStateData.js — Reads the URL state param and returns all data for that state.
 *
 * ========================================================================
 * TODO — Replace Dummy Data with Real Backend API
 * ========================================================================
 *
 * CURRENT IMPLEMENTATION
 *   Imports 10 dummy JSON files for AL and 3 for OR from src/dummy/.
 *   Bundles them into a static DUMMY lookup object keyed by stateId.
 *   Returns the matching bundle synchronously (no loading/error states).
 *
 * REQUIRED API CALL
 *   HTTP Method: GET
 *   Endpoint:    /api/states/:stateId
 *   Purpose:     Returns the full data bundle for a given state (all sections).
 *
 * RESPONSE SHAPE (keys only — see full types in the dummy JSON files)
 * {
 *   stateSummary:    { stateId, stateName, totalPopulation, votingAgePopulation,
 *                      numDistricts, idealDistrictPopulation, isPreclearance,
 *                      voterDistribution:            { electionYear, democraticVoteShare, republicanVoteShare },
 *                      demographicGroups:            [{ group, vap, vapPercentage, isFeasible }],
 *                      redistrictingControl:         { controllingParty },
 *                      congressionalRepresentatives: { totalSeats, byParty: [{ party, seats }] } },
 *   districtSummary: { stateId, planType, electionYear,
 *                      districts: [{ districtId, districtNumber, representative,
 *                                    party, racialGroup, voteMarginPercentage, voteMarginDirection }] },
 *   ensembleSummary: { stateId,
 *                      ensembles: [{ ensembleId, ensembleType, numPlans,
 *                                    populationEqualityThreshold, description }] },
 *   splits:          { stateId, numDistricts, totalPlans,
 *                      enactedPlanSplit: { republican, democratic },
 *                      ensembles: [{ ensembleId, ensembleType,
 *                                    splits: [{ republican, democratic, frequency }] }] },
 *   boxWhisker:      { ... } or null,
 *   ginglesPrecinct: { stateId,
 *                      feasibleSeriesByRace: { [race]: {
 *                        points: [{ id, name, x, y, totalPop, minorityPop,
 *                                   avgHHIncome, regionType, demVotes, repVotes }],
 *                        democraticTrendline: [{ x, y }],
 *                        republicanTrendline: [{ x, y }],
 *                        summaryRows: [{ rangeLabel, precinctCount,
 *                                        avgDemocraticVoteShare, avgRepublicanVoteShare }] } } },
 *   ei:              { stateId, electionYear,
 *                      candidates: [{ candidateId, candidateName, party,
 *                                     racialGroups: [{ group, peakSupportEstimate,
 *                                                      confidenceIntervalLow, confidenceIntervalHigh,
 *                                                      kdePoints: [{ x, y }] }] }] },
 *   heatmapPrecinct: { stateId, granularity,
 *                      bins:     [{ binId, rangeMin, rangeMax, color }],
 *                      features: [{ idx, black, white, hispanic, asian, other }] },
 *   heatmapCensus:   { stateId, granularity, bins: [...], features: [...] }
 * }
 *
 * INTEGRATION STEPS
 *   1. Delete all dummy JSON imports and the DUMMY object below.
 *   2. Add: const [data, setData]       = useState(null)
 *           const [loading, setLoading] = useState(false)
 *           const [error, setError]     = useState(null)
 *   3. Inside the useEffect, fetch GET /api/states/:stateId and call setData().
 *   4. Update the return to: return { stateId, data, loading, error }
 *
 * SEARCHABLE MARKER
 *   //CONNECT HERE: DUMMY lookup
 * ========================================================================
 */

import { useEffect } from 'react'
import { useParams } from 'react-router-dom'
import useAppStore from '../store/useAppStore'


/* ── Step 0: Dummy data imports (DELETE when backend is ready) ───────────────
 *
 *  //CONNECT HERE: DUMMY lookup — delete all imports below + the DUMMY object,
 *  then fetch from GET /api/states/:stateId inside the useEffect instead.
 * ─────────────────────────────────────────────────────────────────────────── */
import ALStateSummary    from '../dummy/AL-state-summary.json'
import ALDistrictSummary from '../dummy/AL-district-summary.json'
import ALEnsembleSummary from '../dummy/AL-ensemble-summary.json'
import ALSplits          from '../dummy/AL-splits.json'
import ALBoxWhisker      from '../dummy/AL-boxwhisker.json'
import ALGinglesCensus   from '../dummy/AL-Gingles-census.json'
import ALGinglesPrecinct from '../dummy/AL-Gingles-precinct.json'
import ALEI              from '../dummy/AL-EI.json'
import ALHeatmapPrecinct from '../dummy/AL-heatmap-precinct.json'
import ALHeatmapCensus   from '../dummy/AL-heatmap-census.json'

import ORStateSummary    from '../dummy/OR-state-summary.json'
import ORDistrictSummary from '../dummy/OR-district-summary.json'
import OREnrobleSummary  from '../dummy/OR-ensemble-summary.json'


/* ── Step 1: Static DUMMY lookup — stateId → full data bundle ────────────────
 *
 *  Keys match the :stateId URL param ('AL', 'OR', …).
 *  OR fields not yet generated are null; section components handle null gracefully.
 *
 *  //CONNECT HERE: replace this whole object with useState(null) populated
 *  by a fetch inside the useEffect below.
 * ─────────────────────────────────────────────────────────────────────────── */
const DUMMY = {
    AL: {
        stateSummary:    ALStateSummary,
        districtSummary: ALDistrictSummary,
        ensembleSummary: ALEnsembleSummary,
        splits:          ALSplits,
        boxWhisker:      ALBoxWhisker,
        ginglesCensus:   ALGinglesCensus,
        ginglesPrecinct: ALGinglesPrecinct,
        ei:              ALEI,
        heatmapPrecinct: ALHeatmapPrecinct,
        heatmapCensus:   ALHeatmapCensus,
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
 * useStateData — Reads :stateId from the URL, syncs it to Zustand, returns data.
 *
 * Drop-in replacement for the real API once the backend is ready — swap the
 * DUMMY[stateId] lookup for an actual fetch() inside the useEffect.
 *
 * @returns {{ stateId: string|undefined, data: object|null }}
 *          stateId  — two-letter state abbreviation from the URL param (e.g. 'AL')
 *          data     — full data bundle for the state, or null if not found
 *
 * CONSUMERS
 *   StatePage — passes stateId + data as props to every section component.
 */
export default function useStateData() {

    /* ── Step 2: Read :stateId from the React Router URL params ─────────── */
    const { stateId } = useParams()
    const setSelectedState = useAppStore(s => s.setSelectedState)

    /* ── Step 3: Sync the URL param into Zustand so the Navbar badge updates */
    useEffect(() => {
        if (stateId) setSelectedState(stateId)
    }, [stateId, setSelectedState])

    /* ── Step 4: Resolve the data bundle from the dummy lookup ──────────────
     *  //CONNECT HERE: replace DUMMY[stateId] with fetched API data
     */
    const data = stateId ? (DUMMY[stateId] ?? null) : null

    return { stateId, data }
}
