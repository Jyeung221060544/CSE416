/**
 * useStateData.js — Reads the URL state param and returns all data for that state.
 *
 * ========================================================================
 * TODO — Replace Dummy Data with Real Backend API
 * ========================================================================
 *
 * CURRENT IMPLEMENTATION
 *   Imports 11 dummy JSON files for AL from src/dummy/.
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
 *                      mapView:                      { center: [lat, lng], zoom },
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
 *   boxWhisker:      { stateId, numDistricts, totalPlans,
 *                      feasibleGroups: string[],
 *                      ensembles: [{ ensembleId, ensembleType,
 *                                    groupDistricts: { [race]: [{ index, min, q1, median, mean, q3, max }] } }],
 *                      enactedPlan: { planId, planType,
 *                                    groupDistricts: { [race]: [{ index, districtId, groupVapPercentage }] } } },
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
 *   eiCompare:       { stateId, electionYear, differenceThreshold,
 *                      racePairs: [{ races: [race1, race2], label,
 *                                    candidates: [{ candidateId, candidateName, party,
 *                                                   peakDifference, probDifferenceGT,
 *                                                   kdePoints: [{ x, y }] }] }] },
 *   heatmapPrecinct: { stateId, granularity,
 *                      bins:     [{ binId, rangeMin, rangeMax, color }],
 *                      features: [{ idx, black, white, hispanic, asian, other }] },
 *   heatmapCensus:   { stateId, granularity, bins: [...], features: [...] },
 *   voteSeatShare:   { stateId, electionYear, raciallyPolarized, totalDistricts, partisanBias,
 *                      curves: [{ party, points: [{ voteShare, seatShare }] }],
 *                      enactedPlan: { democraticVoteShare, democraticSeatShare, label } }
 * }
 *
 * NOTE ON ensembleId FORMAT
 *   IDs follow the pattern <STATE>_<TYPE>, e.g. "AL_RACEBLIND", "AL_VRA".
 *   The ensembleId is consistent across ensembleSummary, splits, and boxWhisker.
 *   The ensembleType field ("race-blind" | "vra-constrained") is what components
 *   use to match entries — ensembleId is a stable cross-reference key for the API.
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
import useAppStore from '@/store/useAppStore'


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
import ALGinglesPrecinct from '../dummy/AL-Gingles-precinct.json'
import ALEI              from '../dummy/AL-EI.json'
import ALEICompare       from '../dummy/AL-EI-compare.json'
import ALHeatmapPrecinct from '../dummy/AL-heatmap-precinct.json'
import ALHeatmapCensus   from '../dummy/AL-heatmap-census.json'
import ALVoteSeatShare   from '../dummy/AL-vote-seat-share.json'


/* ── Step 1: Static DUMMY lookup — stateId → full data bundle ────────────────
 *
 *  Keys match the :stateId URL param ('AL', …).
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
        ginglesPrecinct: ALGinglesPrecinct,
        ei:              ALEI,
        eiCompare:       ALEICompare,
        heatmapPrecinct: ALHeatmapPrecinct,
        heatmapCensus:   ALHeatmapCensus,
        voteSeatShare:   ALVoteSeatShare,
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
    const setSelectedState    = useAppStore(s => s.setSelectedState)
    const setDemographicGroups = useAppStore(s => s.setDemographicGroups)
    const setFeasibleRaceFilter = useAppStore(s => s.setFeasibleRaceFilter)

    /* ── Step 3: Sync state-derived values into Zustand on state change ─────
     *
     *  · setSelectedState    — drives the Navbar badge.
     *  · setDemographicGroups — populates FeasibleRaceFilter dynamically so it
     *                           shows only groups with isFeasible === true for
     *                           the current state (varies by state population).
     *  · setFeasibleRaceFilter — auto-selects the first feasible group so the
     *                            Gingles scatter always has a valid active series
     *                            after a state switch.
     *
     *  //CONNECT HERE: when replacing DUMMY with a real fetch(), call these same
     *  three setters inside the fetch().then() callback with data from the API.
     * ─────────────────────────────────────────────────────────────────────── */
    useEffect(() => {
        if (!stateId) return
        setSelectedState(stateId)

        const groups = DUMMY[stateId]?.stateSummary?.demographicGroups ?? []
        setDemographicGroups(groups)

        // Auto-select the preferred feasible group: black → hispanic → first feasible.
        const preferredFeasible =
            groups.find(g => g.group.toLowerCase() === 'black'    && g.isFeasible) ??
            groups.find(g => g.group.toLowerCase() === 'hispanic' && g.isFeasible) ??
            groups.find(g => g.isFeasible)
        if (preferredFeasible) setFeasibleRaceFilter(preferredFeasible.group.toLowerCase())
    }, [stateId, setSelectedState, setDemographicGroups, setFeasibleRaceFilter])

    /* ── Step 4: Resolve the data bundle from the dummy lookup ──────────────
     *  //CONNECT HERE: replace DUMMY[stateId] with fetched API data
     */
    const data = stateId ? (DUMMY[stateId] ?? null) : null

    return { stateId, data }
}
