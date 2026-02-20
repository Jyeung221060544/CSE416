/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  TODO – Replace ALL dummy data here with real API calls                  ║
 * ║                                                                          ║
 * ║  STEP 1 – Remove every `import ... from '../dummy/...'` line below.     ║
 * ║  STEP 2 – Remove the entire `const DUMMY = { ... }` block.             ║
 * ║  STEP 3 – Add useState for data/loading/error:                          ║
 * ║      const [data, setData]       = useState(null)                       ║
 * ║      const [loading, setLoading] = useState(false)                      ║
 * ║      const [error,   setError]   = useState(null)                       ║
 * ║  STEP 4 – Inside useEffect, fetch from your backend:                    ║
 * ║      setLoading(true)                                                   ║
 * ║      fetch(`/api/states/${stateId}`)                                    ║
 * ║        .then(r => r.json())                                             ║
 * ║        .then(setData)                                                   ║
 * ║        .catch(setError)                                                 ║
 * ║        .finally(() => setLoading(false))                                ║
 * ║                                                                          ║
 * ║  EXPECTED API SHAPE  GET /api/states/:stateId                           ║
 * ║  {                                                                       ║
 * ║    stateSummary:    { stateId, stateName, totalPopulation,              ║
 * ║                       votingAgePopulation, numDistricts,                ║
 * ║                       idealDistrictPopulation, isPreclearance,          ║
 * ║                       voterDistribution: { electionYear, dem%, rep% },  ║
 * ║                       demographicGroups: [{ group, vap, vapPct,         ║
 * ║                                             isFeasible }],              ║
 * ║                       redistrictingControl: { controllingParty },       ║
 * ║                       congressionalRepresentatives: { totalSeats,       ║
 * ║                         byParty: [{ party, seats }] } },                ║
 * ║    districtSummary: { stateId, planType, electionYear,                  ║
 * ║                       districts: [{ districtId, districtNumber,         ║
 * ║                         representative, party, racialGroup,             ║
 * ║                         voteMarginPercentage, voteMarginDirection }] }, ║
 * ║    ensembleSummary: { stateId, ensembles: [{ ensembleId, ensembleType,  ║
 * ║                         numPlans, populationEqualityThreshold,          ║
 * ║                         description }] },                               ║
 * ║    splits:          { ... } or null if not computed,                    ║
 * ║    boxWhisker:      { ... } or null if not computed,                    ║
 * ║    ginglesCensus:   { ... } or null if not computed,                    ║
 * ║    ginglesPrecinct: { ... } or null if not computed,                    ║
 * ║    ei:              { ... } or null if not computed                     ║
 * ║  }                                                                       ║
 * ║                                                                          ║
 * ║  STEP 5 – Update return value:  return { stateId, data, loading, error }║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import { useEffect } from 'react'
import { useParams } from 'react-router-dom'
import useAppStore from '../store/useAppStore'

// ── Dummy data imports (DELETE when backend is ready) ────────────
import ALStateSummary    from '../dummy/AL-state-summary.json'
import ALDistrictSummary from '../dummy/AL-district-summary.json'
import ALEnsembleSummary from '../dummy/AL-ensemble-summary.json'
import ALSplits          from '../dummy/AL-splits.json'
import ALBoxWhisker      from '../dummy/AL-boxwhisker.json'
import ALGinglesCensus   from '../dummy/AL-Gingles-census.json'
import ALGinglesPrecinct from '../dummy/AL-Gingles-precinct.json'
import ALEI              from '../dummy/AL-EI.json'

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
        ginglesCensus:   ALGinglesCensus,
        ginglesPrecinct: ALGinglesPrecinct,
        ei:              ALEI,
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

    const data = stateId ? (DUMMY[stateId] ?? null) : null

    return { stateId, data }
}
