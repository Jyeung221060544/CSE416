const BASE = 'http://localhost:8080'

export async function fetchStates() {
    const res = await fetch(`${BASE}/api/states`)
    if (!res.ok) throw new Error(`GET /api/states failed: ${res.status}`)
    return res.json()
}

export async function fetchOverviewStateStats(stateId) {
    const res = await fetch(`${BASE}/api/states/${stateId}/overview/state-stats`)
    if (!res.ok) throw new Error(`GET /api/states/${stateId}/overview/state-stats failed: ${res.status}`)
    return res.json()
}

const _districtPromise = {}
export function fetchDistricts(stateId) {
    if (!_districtPromise[stateId]) {
        _districtPromise[stateId] = fetch(`${BASE}/api/states/${stateId}/geo/districts`)
            .then(res => { if (!res.ok) throw new Error(`GET /api/states/${stateId}/geo/districts failed: ${res.status}`); return res.json() })
            .catch(err => { delete _districtPromise[stateId]; throw err })
    }
    return _districtPromise[stateId]
}

export async function fetchHeatmap(stateId, race) {
    const res = await fetch(`${BASE}/api/states/${stateId}/heatmap?race=${race}`)
    if (!res.ok) throw new Error(`GET /api/states/${stateId}/heatmap failed: ${res.status}`)
    return res.json()
}

export async function fetchEnsembleSplits(stateId) {
    const res = await fetch(`${BASE}/api/states/${stateId}/ensemble/splits`)
    if (!res.ok) throw new Error(`GET /api/states/${stateId}/ensemble/splits failed: ${res.status}`)
    return res.json()
}

export async function fetchEnsembleBoxWhisker(stateId) {
    const res = await fetch(`${BASE}/api/states/${stateId}/ensemble/box-whisker`)
    if (!res.ok) throw new Error(`GET /api/states/${stateId}/ensemble/box-whisker failed: ${res.status}`)
    return res.json()
}

export async function fetchEffectiveness(stateId) {
    const res = await fetch(`${BASE}/api/states/${stateId}/effectiveness`)
    if (!res.ok) throw new Error(`GET /api/states/${stateId}/ensemble/effectiveness failed: ${res.status}`)
    return res.json()
}

export async function fetchEnsembleMinorityDistricts(stateId) {
    const res = await fetch(`${BASE}/api/states/${stateId}/ensemble/minority-districts`)
    if (!res.ok) throw new Error(`GET /api/states/${stateId}/ensemble/minority-districts failed: ${res.status}`)
    return res.json()
}

export async function fetchGingles(stateId, race) {
    const res = await fetch(`${BASE}/api/states/${stateId}/gingles?race=${race}`)
    if (!res.ok) throw new Error(`GET /api/states/${stateId}/gingles?race=${race} failed: ${res.status}`)
    return res.json()
}

export async function fetchEiKde(stateId) {
    const res = await fetch(`${BASE}/api/states/${stateId}/ei`)
    if (!res.ok) throw new Error(`GET /api/states/${stateId}/ei failed: ${res.status}`)
    return res.json()
}

export async function fetchEiCompare(stateId, race1, race2) {
    const res = await fetch(`${BASE}/api/states/${stateId}/ei-compare?race1=${race1}&race2=${race2}`)
    if (!res.ok) throw new Error(`GET /api/states/${stateId}/ei-compare failed: ${res.status}`)
    return res.json()
}


export async function fetchVoteSeatShare(stateId) {
    const res = await fetch(`${BASE}/api/states/${stateId}/vote-seat-share`)
    if (!res.ok) throw new Error(`GET /api/states/${stateId}/vote-seat-share failed: ${res.status}`)
    return res.json()
}

const _precinctPromise = {}
export function fetchPrecincts(stateId) {
    if (!_precinctPromise[stateId]) {
        _precinctPromise[stateId] = fetch(`${BASE}/api/states/${stateId}/geo/precincts`)
            .then(res => { if (!res.ok) throw new Error(`GET /api/states/${stateId}/geo/precincts failed: ${res.status}`); return res.json() })
            .catch(err => { delete _precinctPromise[stateId]; throw err })
    }
    return _precinctPromise[stateId]
}


const _interestingPlanPromise = {}
export function fetchInterestingPlan(stateId, planType) {
    const key = `${stateId}_${planType}`
    if (!_interestingPlanPromise[key]) {
        _interestingPlanPromise[key] = fetch(`${BASE}/api/states/${stateId}/geo/interesting-plans/${planType}`)
            .then(res => { if (!res.ok) throw new Error(`GET /api/states/${stateId}/geo/interesting-plans/${planType} failed: ${res.status}`); return res.json() })
            .catch(err => { delete _interestingPlanPromise[key]; throw err })
    }
    return _interestingPlanPromise[key]
}

export async function fetchUsStatesGeo() {
    const res = await fetch(`${BASE}/api/geo/us-states`)
    if (!res.ok) throw new Error(`GET /api/geo/us-states failed: ${res.status}`)
    return res.json()
}


