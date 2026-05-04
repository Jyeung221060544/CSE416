/**
 * @file RepresentationGapMap.jsx
 *
 * LAYER STACK (bottom to top)
 *   1. CartoDB light tiles
 *   2. Precinct heatmap — choropleth by selected minority race's population concentration
 *   3. District boundaries — coloring depends on plan:
 *        · current plan  → enacted GeoJSON geometry; green (effective) / black outline (not)
 *        · high/low plan → interesting plan geometry; green (is_effective=true) / black outline
 *
 * PROPS
 * @prop {string} stateId         - "AL" | "OR"
 * @prop {string} plan            - 'current' | 'high' | 'low'
 * @prop {object} districtSummary - District metadata (racialGroup per district for current plan).
 * @prop {string} feasibleRace    - Minority race key driving heatmap + effectiveness overlay.
 */

import { useEffect, useRef, useState } from 'react'
import { MapContainer, GeoJSON, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'
import { fetchDistricts, fetchInterestingPlan, fetchPrecincts, fetchHeatmap } from '../../api'
import { EFFECTIVE_FILL, EFFECTIVE_BORDER } from '../../lib/partyColors'

/* ── Module-level caches ─────────────────────────────────────────────────── */
const enactedGeoCache      = {}  // stateId → enacted district GeoJSON (clean boundaries)
const interestingPlanCache = {}  // `${stateId}_${plan}` → interesting plan feature data
const precinctGeoCache     = {}  // stateId → precinct GeoJSON
const heatmapDataCache     = {}  // `${stateId}_${race}` → { bins, features }
const _heatmapInFlight     = {}  // dedup in-flight heatmap requests

/* ── Flatten MultiPolygon → Polygon (keep largest part only) ─────────────── */
// Ensemble plan GeoJSONs can contain non-contiguous MultiPolygon features with
// artifact slivers. For a clean district-boundary display, keep only the
// largest ring (by point count) and convert to a simple Polygon.
function cleanGeoJson(geoJson) {
    if (!geoJson?.features) return geoJson
    const features = geoJson.features.map(f => {
        if (f.geometry?.type !== 'MultiPolygon') return f
        const largest = f.geometry.coordinates.reduce((best, poly) =>
            (poly[0]?.length ?? 0) > (best[0]?.length ?? 0) ? poly : best
        )
        return { ...f, geometry: { type: 'Polygon', coordinates: largest } }
    })
    return { ...geoJson, features }
}

/* ── Shared effectiveness style ──────────────────────────────────────────── */
// effective   → green fill + bright white border with green glow
// not effective → transparent fill + white border with white glow (visible over teal heatmap)
function effectivenessStyle(isEffective) {
    return isEffective
        ? { fillColor: EFFECTIVE_FILL, fillOpacity: 0.28, color: '#fef08a', weight: 4, opacity: 0.45, className: 'rg-district-effective' }
        : { fillOpacity: 0, fillColor: 'none',            color: '#fef08a', weight: 4, opacity: 0.45, className: 'rg-district-outline'    }
}

/* ── Unified district style — reads isEffective directly from feature properties ── */
function getDistrictStyle(feature) {
    return effectivenessStyle(feature.properties?.isEffective ?? false)
}

/* ── FitBounds helper ─────────────────────────────────────────────────────── */
function FitBounds({ geoData }) {
    const map = useMap()
    useEffect(() => {
        if (!geoData) return
        try {
            const bounds = L.geoJSON(geoData).getBounds()
            if (bounds.isValid()) map.fitBounds(bounds, { padding: [20, 20] })
        } catch (_) {}
    }, [geoData, map])
    return null
}

/* ── MapResizeHandler helper ──────────────────────────────────────────────── */
function MapResizeHandler({ geoData }) {
    const map = useMap()
    useEffect(() => {
        const container = map.getContainer()
        if (!container) return
        const observer = new ResizeObserver(() => {
            map.invalidateSize({ animate: false })
            if (geoData) {
                try {
                    const bounds = L.geoJSON(geoData).getBounds()
                    if (bounds.isValid()) map.fitBounds(bounds, { padding: [20, 20] })
                } catch (_) {}
            }
        })
        observer.observe(container)
        return () => observer.disconnect()
    }, [map, geoData])
    return null
}

/* ── Heatmap legend ───────────────────────────────────────────────────────── */
function HeatmapLegend({ bins, raceName }) {
    if (!bins?.length || !raceName) return null
    return (
        <div style={{ position: 'absolute', bottom: 24, left: 10, zIndex: 1000, pointerEvents: 'none' }}>
            <div className="bg-white/92 backdrop-blur-sm rounded-lg px-3 py-2 shadow-md text-[10px] text-brand-darkest leading-tight">
                <p className="font-semibold mb-1.5 capitalize tracking-wide">{raceName} Population</p>
                <div className="flex flex-col gap-[3px]">
                    {bins.map(bin => (
                        <div key={bin.binId} className="flex items-center gap-1.5">
                            <div style={{
                                width: 13, height: 13, borderRadius: 2, flexShrink: 0,
                                backgroundColor: bin.color,
                                border: '1px solid rgba(0,0,0,0.18)',
                            }} />
                            <span>{bin.rangeMin}–{bin.rangeMax}%</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}

/* ── Main component ───────────────────────────────────────────────────────── */
export default function RepresentationGapMap({ stateId, plan, districtSummary, feasibleRace, onEffectiveCount }) {

    const [enactedGeoData,    setEnactedGeoData]    = useState(null)  // enacted plan (clean boundaries)
    const [interestingGeoData, setInterestingGeoData] = useState(null)  // interesting plan GeoJSON
    const [precinctData,      setPrecinctData]      = useState(null)
    const [heatmapData,     setHeatmapData]      = useState(null)
    const [notFound,        setNotFound]         = useState(false)

    const precinctLayerRef = useRef(null)
    const districtLayerRef = useRef(null)

    /* ── Always fetch the enacted district GeoJSON (clean boundaries) ─────── */
    useEffect(() => {
        if (enactedGeoCache[stateId]) { setEnactedGeoData(enactedGeoCache[stateId]); return }
        setEnactedGeoData(null)
        fetchDistricts(stateId)
            .then(data => { enactedGeoCache[stateId] = data; setEnactedGeoData(data) })
            .catch(err => console.error('[RepresentationGapMap] fetchDistricts error:', err))
    }, [stateId])

    /* ── Report effective district count when enacted GeoJSON loads ──────── */
    useEffect(() => {
        if (plan !== 'current' || !enactedGeoData || !onEffectiveCount) return
        const count = enactedGeoData.features?.filter(f => f.properties?.isEffective).length ?? 0
        onEffectiveCount(count)
    }, [plan, enactedGeoData, onEffectiveCount])

    /* ── For interesting plans: fetch the full GeoJSON (geometry + properties) */
    useEffect(() => {
        setNotFound(false)
        if (plan === 'current') { setInterestingGeoData(null); return }

        const cacheKey = `${stateId}_${plan}`
        if (interestingPlanCache[cacheKey]) { setInterestingGeoData(interestingPlanCache[cacheKey]); return }
        setInterestingGeoData(null)
        fetchInterestingPlan(stateId, plan)
            .then(data => { const clean = cleanGeoJson(data); interestingPlanCache[cacheKey] = clean; setInterestingGeoData(clean) })
            .catch(err => {
                console.error('[RepresentationGapMap] fetchInterestingPlan error:', err)
                setNotFound(true)
            })
    }, [stateId, plan])

    /* ── Report effective district count when interesting GeoJSON loads ──── */
    useEffect(() => {
        if (plan === 'current' || !interestingGeoData || !onEffectiveCount) return
        const count = interestingGeoData.features?.filter(f => f.properties?.isEffective).length ?? 0
        onEffectiveCount(count)
    }, [plan, interestingGeoData, onEffectiveCount])

    /* ── Fetch precinct GeoJSON (heatmap base layer) ─────────────────────── */
    useEffect(() => {
        if (precinctGeoCache[stateId]) { setPrecinctData(precinctGeoCache[stateId]); return }
        setPrecinctData(null)
        fetchPrecincts(stateId)
            .then(data => { precinctGeoCache[stateId] = data; setPrecinctData(data) })
            .catch(err => console.error('[RepresentationGapMap] fetchPrecincts error:', err))
    }, [stateId])

    /* ── Fetch heatmap bin colors for the selected race ──────────────────── */
    useEffect(() => {
        if (!feasibleRace) { setHeatmapData(null); return }
        const key = `${stateId}_${feasibleRace}`
        if (heatmapDataCache[key]) { setHeatmapData(heatmapDataCache[key]); return }
        if (!_heatmapInFlight[key]) {
            _heatmapInFlight[key] = fetchHeatmap(stateId, feasibleRace)
                .then(data  => { heatmapDataCache[key] = data; return data })
                .catch(err  => { console.error('[RepresentationGapMap] fetchHeatmap error:', err); delete _heatmapInFlight[key]; return null })
        }
        _heatmapInFlight[key].then(data => { if (data) setHeatmapData(data) })
    }, [stateId, feasibleRace])

    /* ── Imperatively re-style precinct layer when heatmap colors change ──── */
    useEffect(() => {
        if (!precinctLayerRef.current || !heatmapData) return
        const binColor = {}
        heatmapData.bins?.forEach(b => { binColor[b.binId] = b.color })
        const colorByIdx = {}
        heatmapData.features?.forEach(f => { colorByIdx[f.idx] = binColor[f.binId] ?? '#f0fdfa' })
        let counter = 0
        precinctLayerRef.current.eachLayer(layer => {
            const idx = layer.feature?.properties?.idx ?? counter++
            layer.setStyle({ fillColor: colorByIdx[idx] ?? '#f0fdfa', fillOpacity: 0.80, color: '#134e4a', weight: 0.5 })
        })
    }, [heatmapData]) // eslint-disable-line react-hooks/exhaustive-deps

    /* ── Build initial colorByIdx for first precinct render ─────────────── */
    const colorByIdx = {}
    if (heatmapData?.features && heatmapData?.bins) {
        const binColor = {}
        heatmapData.bins.forEach(b => { binColor[b.binId] = b.color })
        heatmapData.features.forEach(f => { colorByIdx[f.idx] = binColor[f.binId] ?? '#f0fdfa' })
    }

    let precinctCounter = 0
    const center = [39.5, -98.35]

    return (
        <div style={{ position: 'relative', height: '100%', width: '100%' }}>
            <style>{`
                .rg-district-effective { filter: drop-shadow(0 0 4px rgba(254,240,138,0.85)) drop-shadow(0 0 2px rgba(254,240,138,0.7)); }
                .rg-district-outline   { filter: drop-shadow(0 0 3px rgba(254,240,138,0.75)); }
            `}</style>
            <MapContainer
                key={`rg-${stateId}-${plan}`}
                center={center}
                zoom={4}
                zoomSnap={0}
                zoomControl
                scrollWheelZoom={false}
                doubleClickZoom={false}
                attributionControl={false}
                style={{ height: '100%', width: '100%' }}
            >
                <FitBounds geoData={enactedGeoData} />
                <MapResizeHandler geoData={enactedGeoData} />
                <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />

                {/* ── PRECINCT HEATMAP (base layer) ──────────────────────────
                    Keyed only on stateId — re-styles imperatively on race change
                    to avoid remounting the 100+ MB precinct geometry layer.
                    add event fires when precincts join the map, pushing the
                    district layer back on top via bringToFront(). ─────────── */}
                {precinctData && (
                    <GeoJSON
                        key={`rg-precincts-${stateId}`}
                        ref={precinctLayerRef}
                        data={precinctData}
                        eventHandlers={{ add: () => districtLayerRef.current?.bringToFront() }}
                        style={feature => {
                            const idx = feature?.properties?.idx ?? precinctCounter++
                            return {
                                fillColor:   colorByIdx[idx] ?? '#f0fdfa',
                                fillOpacity: heatmapData ? 0.80 : 0,
                                color:       '#134e4a',
                                weight:      0.5,
                            }
                        }}
                    />
                )}

                {/* ── CURRENT PLAN: enacted boundaries, isEffective from feature properties ── */}
                {plan === 'current' && enactedGeoData && (
                    <GeoJSON
                        key={`rg-current-${stateId}`}
                        ref={districtLayerRef}
                        data={enactedGeoData}
                        style={getDistrictStyle}
                    />
                )}

                {/* ── INTERESTING PLAN: own geometry, isEffective from feature properties ── */}
                {plan !== 'current' && interestingGeoData && (
                    <GeoJSON
                        key={`rg-interesting-${stateId}-${plan}`}
                        ref={districtLayerRef}
                        data={interestingGeoData}
                        style={getDistrictStyle}
                    />
                )}
            </MapContainer>

            {/* ── HEATMAP LEGEND ────────────────────────────────────────────── */}
            <HeatmapLegend bins={heatmapData?.bins} raceName={feasibleRace} />

            {/* ── "NOT AVAILABLE" OVERLAY (404 from backend) ───────────────── */}
            {notFound && (
                <div style={{
                    position: 'absolute', inset: 0, pointerEvents: 'none',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: 1000,
                }}>
                    <div className="bg-white/85 backdrop-blur-sm rounded-lg px-5 py-3 shadow text-sm text-brand-darkest text-center">
                        <p className="font-semibold">District boundaries not yet available</p>
                        <p className="text-xs text-brand-muted/70 mt-0.5">Awaiting SeaWulf ensemble run</p>
                    </div>
                </div>
            )}
        </div>
    )
}
