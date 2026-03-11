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

/** GET /api/states/:stateId/overview/state-stats
 *  Returns { stateSummary, districtSummary }
 *  Triggered by: entering the State Overview section (immediately on state page load) */
export async function fetchOverviewStateStats(stateId) {
    const res = await fetch(`${BASE}/api/states/${stateId}/overview/state-stats`)
    if (!res.ok) throw new Error(`GET /api/states/${stateId}/overview/state-stats failed: ${res.status}`)
    return res.json()
}

/** GET /api/states/:stateId/overview/ensemble-demo
 *  Returns { ensembleSummary }
 *  Triggered by: first entry to the Ensemble/Pop Stats tab in State Overview */
export async function fetchOverviewEnsembleDemo(stateId) {
    const res = await fetch(`${BASE}/api/states/${stateId}/overview/ensemble-demo`)
    if (!res.ok) throw new Error(`GET /api/states/${stateId}/overview/ensemble-demo failed: ${res.status}`)
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

/** GET /api/states/:stateId/ensemble/splits
 *  Returns the ensemble splits payload { enactedPlanSplit, ensembles, totalPlans, numDistricts }
 *  Triggered by: entering the Ensemble Splits tab */
export async function fetchEnsembleSplits(stateId) {
    const res = await fetch(`${BASE}/api/states/${stateId}/ensemble/splits`)
    if (!res.ok) throw new Error(`GET /api/states/${stateId}/ensemble/splits failed: ${res.status}`)
    return res.json()
}

/** GET /api/states/:stateId/ensemble/box-whisker
 *  Returns the box-whisker payload { feasibleGroups, ensembles, enactedPlan }
 *  Triggered by: entering the Box & Whisker tab */
export async function fetchEnsembleBoxWhisker(stateId) {
    const res = await fetch(`${BASE}/api/states/${stateId}/ensemble/box-whisker`)
    if (!res.ok) throw new Error(`GET /api/states/${stateId}/ensemble/box-whisker failed: ${res.status}`)
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

/** GET /api/states/:stateId/geo/precincts
 *  Returns GeoJSON FeatureCollection of precinct boundaries.
 *  Used by DemographicHeatmap for the precinct heatmap layer.
 *  Promise-cached: concurrent calls (e.g. StrictMode double-invoke) share one in-flight request. */
const _precinctPromise = {}
export function fetchPrecincts(stateId) {
    if (!_precinctPromise[stateId]) {
        _precinctPromise[stateId] = fetch(`${BASE}/api/states/${stateId}/geo/precincts`)
            .then(res => { if (!res.ok) throw new Error(`GET /api/states/${stateId}/geo/precincts failed: ${res.status}`); return res.json() })
            .catch(err => { delete _precinctPromise[stateId]; throw err })
    }
    return _precinctPromise[stateId]
}

/** GET /api/geo/us-states
 *  Returns GeoJSON FeatureCollection of the 48 contiguous US state outlines.
 *  Used by USMap for the splash-screen choropleth. */
export async function fetchUsStatesGeo() {
    const res = await fetch(`${BASE}/api/geo/us-states`)
    if (!res.ok) throw new Error(`GET /api/geo/us-states failed: ${res.status}`)
    return res.json()
}

/** GET /api/states/:stateId/geo/districts
 *  Returns GeoJSON FeatureCollection of congressional district boundaries.
 *  Used by DistrictMap2024 and DemographicHeatmap.
 *  Promise-cached: concurrent calls (e.g. StrictMode double-invoke, two map components) share one in-flight request. */
const _districtPromise = {}
export function fetchDistricts(stateId) {
    if (!_districtPromise[stateId]) {
        _districtPromise[stateId] = fetch(`${BASE}/api/states/${stateId}/geo/districts`)
            .then(res => { if (!res.ok) throw new Error(`GET /api/states/${stateId}/geo/districts failed: ${res.status}`); return res.json() })
            .catch(err => { delete _districtPromise[stateId]; throw err })
    }
    return _districtPromise[stateId]
}
