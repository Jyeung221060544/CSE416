
import { useEffect, useRef, useState } from 'react'
import { MapContainer, GeoJSON, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'
import { fetchDistricts, fetchInterestingPlan, fetchPrecincts, fetchHeatmap } from '../../api'
import { EFFECTIVE_FILL } from '../../lib/partyColors'

const enactedGeoCache      = {}  
const interestingPlanCache = {}  
const precinctGeoCache     = {} 
const heatmapDataCache     = {} 
const _heatmapInFlight     = {} 


/**
 * Returns a Leaflet style object for a district based on its effectiveness.
 * @param {boolean} isEffective - Whether the district is considered effective.
 * @returns {object} Leaflet path style options.
 */
function effectivenessStyle(isEffective) {
    return isEffective
        ? { fillColor: EFFECTIVE_FILL, fillOpacity: 0.28, color: '#fef08a', weight: 4, opacity: 0.45, className: 'rg-district-effective' }
        : { fillOpacity: 0, fillColor: 'none',            color: '#fef08a', weight: 4, opacity: 0.45, className: 'rg-district-outline'    }
}

/**
 * Derives the Leaflet style for a GeoJSON district feature.
 * @param {object} feature - GeoJSON feature with an isEffective property.
 * @returns {object} Leaflet path style options.
 */
function getDistrictStyle(feature) {
    return effectivenessStyle(feature.properties?.isEffective ?? false)
}

/**
 * Fits the map viewport to the bounds of the given GeoJSON data.
 * @param {object} geoData - GeoJSON FeatureCollection to fit the map to.
 */
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

/**
 * Observes container resize events and invalidates the map size accordingly.
 * @param {object} geoData - GeoJSON FeatureCollection used to re-fit bounds on resize.
 */
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

/**
 * Renders a color-coded legend for the demographic heatmap overlay.
 * @param {Array<{binId: string, color: string, rangeMin: number, rangeMax: number}>} bins - Bin definitions from heatmap data.
 * @param {string} raceName - Display name of the selected race/demographic.
 */
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

/**
 * Renders a Leaflet map showing district effectiveness for a given plan,
 * with an optional demographic heatmap overlay at the precinct level.
 * @param {string} stateId - State identifier used to fetch geographic data.
 * @param {string} plan - Selected plan key ('current' or an interesting plan ID).
 * @param {object} districtSummary - Summary data for district-level statistics.
 * @param {string|null} feasibleRace - Race filter for the heatmap overlay; null hides it.
 * @param {function} onEffectiveCount - Callback fired with the count of effective districts.
 */
export default function RepresentationGapMap({ stateId, plan, feasibleRace, onEffectiveCount }) {

    // Step 0: Declare state for geo layers and loading flags
    const [enactedGeoData,    setEnactedGeoData]    = useState(null)  // enacted plan (clean boundaries)
    const [interestingGeoData, setInterestingGeoData] = useState(null)  // interesting plan GeoJSON
    const [precinctData,      setPrecinctData]      = useState(null)
    const [heatmapData,     setHeatmapData]      = useState(null)
    const [notFound,        setNotFound]         = useState(false)

    const precinctLayerRef = useRef(null)
    const districtLayerRef = useRef(null)

    // Step 1: Load enacted district boundaries (cached per state)
    useEffect(() => {
        if (enactedGeoCache[stateId]) { setEnactedGeoData(enactedGeoCache[stateId]); return }
        setEnactedGeoData(null)
        fetchDistricts(stateId)
            .then(data => { enactedGeoCache[stateId] = data; setEnactedGeoData(data) })
            .catch(err => console.error('[RepresentationGapMap] fetchDistricts error:', err))
    }, [stateId])

    // Step 2: Report effective district count for the enacted plan
    useEffect(() => {
        if (plan !== 'current' || !enactedGeoData || !onEffectiveCount) return
        const count = enactedGeoData.features?.filter(f => f.properties?.isEffective).length ?? 0
        onEffectiveCount(count)
    }, [plan, enactedGeoData, onEffectiveCount])

    // Step 3: Load interesting plan GeoJSON when a non-current plan is selected
    useEffect(() => {
        setNotFound(false)
        if (plan === 'current') { setInterestingGeoData(null); return }

        const cacheKey = `${stateId}_${plan}`
        if (interestingPlanCache[cacheKey]) { setInterestingGeoData(interestingPlanCache[cacheKey]); return }
        setInterestingGeoData(null)
        fetchInterestingPlan(stateId, plan)
            .then(data => { interestingPlanCache[cacheKey] = data; setInterestingGeoData(data) })
            .catch(err => {
                console.error('[RepresentationGapMap] fetchInterestingPlan error:', err)
                setNotFound(true)
            })
    }, [stateId, plan])

    // Step 4: Report effective district count for the interesting plan
    useEffect(() => {
        if (plan === 'current' || !interestingGeoData || !onEffectiveCount) return
        const count = interestingGeoData.features?.filter(f => f.properties?.isEffective).length ?? 0
        onEffectiveCount(count)
    }, [plan, interestingGeoData, onEffectiveCount])

    // Step 5: Load precinct GeoJSON for the heatmap base layer (cached per state)
    useEffect(() => {
        if (precinctGeoCache[stateId]) { setPrecinctData(precinctGeoCache[stateId]); return }
        setPrecinctData(null)
        fetchPrecincts(stateId)
            .then(data => { precinctGeoCache[stateId] = data; setPrecinctData(data) })
            .catch(err => console.error('[RepresentationGapMap] fetchPrecincts error:', err))
    }, [stateId])

    // Step 6: Fetch heatmap bin data for the selected race (deduped in-flight requests)
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

    // Step 7: Imperatively restyle precinct layer when heatmap data changes
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
    }, [heatmapData])

    // Step 8: Build idx → color lookup for initial precinct render
    const colorByIdx = {}
    if (heatmapData?.features && heatmapData?.bins) {
        const binColor = {}
        heatmapData.bins.forEach(b => { binColor[b.binId] = b.color })
        heatmapData.features.forEach(f => { colorByIdx[f.idx] = binColor[f.binId] ?? '#f0fdfa' })
    }

    let precinctCounter = 0
    const center = [39.5, -98.35]

    // Step 9: Render map with precinct heatmap, district outlines, and legend
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

                {plan === 'current' && enactedGeoData && (
                    <GeoJSON
                        key={`rg-current-${stateId}`}
                        ref={districtLayerRef}
                        data={enactedGeoData}
                        style={getDistrictStyle}
                    />
                )}

                {plan !== 'current' && interestingGeoData && (
                    <GeoJSON
                        key={`rg-interesting-${stateId}-${plan}`}
                        ref={districtLayerRef}
                        data={interestingGeoData}
                        style={getDistrictStyle}
                    />
                )}
            </MapContainer>

            <HeatmapLegend bins={heatmapData?.bins} raceName={feasibleRace} />

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
