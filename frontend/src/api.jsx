/**
 * api.jsx — Centralized API client for all backend requests.
 *
 * Each function maps to one backend endpoint. Callers receive the parsed
 * JSON body on success and a thrown Error on non-2xx responses.
 *
 * BASE URL: http://localhost:8080  (Spring Boot default port)
 */

const BASE = 'http://localhost:8080'

/** GET /api/states */
export async function fetchStates() {
    const res = await fetch(`${BASE}/api/states`)
    if (!res.ok) throw new Error(`GET /api/states failed: ${res.status}`)
    return res.json()
}

/** GET /api/states/:stateId/overview
 *  Returns { stateSummary, districtSummary, ensembleSummary,
 *            availableHeatmapRaces, availableEiComparePairs } */
export async function fetchOverview(stateId) {
    const res = await fetch(`${BASE}/api/states/${stateId}/overview`)
    if (!res.ok) throw new Error(`GET /api/states/${stateId}/overview failed: ${res.status}`)
    return res.json()
}

/** GET /api/states/:stateId/heatmap?granularity=&race=
 *  Returns { stateId, granularity, race, bins:[{binId,rangeMin,rangeMax,color}],
 *            features:[{idx, binId}] }
 *  Triggered by: entering Demographic section OR raceFilter/granularityFilter change */
export async function fetchHeatmap(stateId, granularity, race) {
    const res = await fetch(`${BASE}/api/states/${stateId}/heatmap?granularity=${granularity}&race=${race}`)
    if (!res.ok) throw new Error(`GET /api/states/${stateId}/heatmap failed: ${res.status}`)
    return res.json()
}

/** GET /api/states/:stateId/ensemble
 *  Returns { splits:{...}, boxWhisker:{...} }
 *  Triggered by: entering Ensemble Analysis section */
export async function fetchEnsemble(stateId) {
    const res = await fetch(`${BASE}/api/states/${stateId}/ensemble`)
    if (!res.ok) throw new Error(`GET /api/states/${stateId}/ensemble failed: ${res.status}`)
    return res.json()
}

/** GET /api/states/:stateId/gingles?race=
 *  Returns { stateId, race, points, democraticTrendline, republicanTrendline, summaryRows }
 *  Triggered by: entering Gingles tab OR feasibleRaceFilter change */
export async function fetchGingles(stateId, race) {
    const res = await fetch(`${BASE}/api/states/${stateId}/gingles?race=${race}`)
    if (!res.ok) throw new Error(`GET /api/states/${stateId}/gingles?race=${race} failed: ${res.status}`)
    return res.json()
}

/** GET /api/states/:stateId/ei?race=
 *  Returns { stateId, race, electionYear,
 *            candidates:[{candidateId, candidateName, party,
 *              peakSupportEstimate, confidenceIntervalLow, confidenceIntervalHigh, kdePoints}] }
 *  Triggered by: each newly checked race in eiRaceFilter (multi-select) */
export async function fetchEiKde(stateId, race) {
    const res = await fetch(`${BASE}/api/states/${stateId}/ei?race=${race}`)
    if (!res.ok) throw new Error(`GET /api/states/${stateId}/ei?race=${race} failed: ${res.status}`)
    return res.json()
}

/** GET /api/states/:stateId/ei-compare?race1=&race2=
 *  Returns { stateId, races, label, electionYear, differenceThreshold, candidates }
 *  Triggered by: eiKdeCompareRaces pair change */
export async function fetchEiCompare(stateId, race1, race2) {
    const res = await fetch(`${BASE}/api/states/${stateId}/ei-compare?race1=${race1}&race2=${race2}`)
    if (!res.ok) throw new Error(`GET /api/states/${stateId}/ei-compare failed: ${res.status}`)
    return res.json()
}

/** GET /api/states/:stateId/vote-seat-share
 *  Returns { stateId, electionYear, raciallyPolarized, totalDistricts,
 *            partisanBias, curves, enactedPlan }
 *  Triggered by: entering Racial Polarization section */
export async function fetchVoteSeatShare(stateId) {
    const res = await fetch(`${BASE}/api/states/${stateId}/vote-seat-share`)
    if (!res.ok) throw new Error(`GET /api/states/${stateId}/vote-seat-share failed: ${res.status}`)
    return res.json()
}
