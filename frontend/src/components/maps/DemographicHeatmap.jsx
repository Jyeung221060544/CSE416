/**
 * ========================================================================
 * TODO – Replace Dummy Data with Real Backend API
 * ========================================================================
 *
 * CURRENT IMPLEMENTATION
 * - Imports ALPrecinctMap.json (1947 precincts) and ALBlockMap.json
 *   (100 census blocks) from src/assets/ as static GeoJSON geometry
 * - Imports ALCongressionalDistricts.json and ORCongressionalDistrict.json
 *   for the state outline layer
 * - heatmapData (bins + per-feature binIds) comes via props from useStateData,
 *   which reads from dummy AL-heatmap-precinct.json / AL-heatmap-census.json
 *
 * REQUIRED API CALLS
 * - HTTP Method: GET
 * - Endpoint A: /api/states/:stateId/heatmap?granularity=precinct|census_block
 *   Purpose:     Returns geometry + server-assigned bin colors for each unit
 * - Endpoint B: /api/states/:stateId/districts/geojson
 *   Purpose:     Returns the state outline (already shared with DistrictMap2024)
 *
 * RESPONSE SNAPSHOT (keys only) — Endpoint A
 * {
 *   stateId, granularity,
 *   bins: [{ binId, rangeMin, rangeMax, color }],
 *   features: [{
 *     idx,
 *     black, white, hispanic, asian, other,  (each is a binId int)
 *     geometry: { type, coordinates }        (or served separately as GeoJSON)
 *   }]
 * }
 *
 * INTEGRATION INSTRUCTIONS
 * - Replace GEO_SAMPLES static asset imports with geometry embedded in or
 *   alongside the API response (or keep as static assets if geometry is large)
 * - Replace STATE_OUTLINE static imports with GeoJSON from Endpoint B
 * - heatmapData (bins + features) flows in via props — wire useStateData to
 *   fetch Endpoint A and pass the result as heatmapPrecinct / heatmapCensus
 *
 * SEARCHABLE MARKER
 * //CONNECT HERE: GEO_SAMPLES + STATE_OUTLINE — replace asset imports with API data
 *
 * ========================================================================
 */

import { useEffect } from 'react'
import { MapContainer, GeoJSON, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'

//CONNECT HERE: GEO_SAMPLES + STATE_OUTLINE — delete these 4 asset imports and both
// static lookup objects; replace with geometry from GET /api/states/:stateId/heatmap
// and outline from GET /api/states/:stateId/districts/geojson
import ALPrecinctFull from '../../assets/ALPrecinctMap.json'
import ALBlockSample  from '../../assets/ALBlockMap.json'
import ALDistricts    from '../../assets/ALCongressionalDistricts.json'
import ORDistricts    from '../../assets/ORCongressionalDistrict.json'

// ── GeoJSON lookup ─────────────────────────────────────────────────────
//CONNECT HERE: STATE_OUTLINE — replace with GeoJSON from /api/states/:stateId/districts/geojson
const STATE_OUTLINE = { AL: ALDistricts, OR: ORDistricts }

//CONNECT HERE: GEO_SAMPLES — replace with geometry embedded in the heatmap API response
const GEO_SAMPLES = {
    AL: {
        precinct:     ALPrecinctFull,   // 1947 real precincts, reprojected to WGS84
        census_block: ALBlockSample,    // 100 real census blocks (NW Alabama)
    },
}

// ── Leaflet helpers ────────────────────────────────────────────────────
function FitBounds({ data }) {
    const map = useMap()
    useEffect(() => {
        if (!data) return
        try {
            const b = L.geoJSON(data).getBounds()
            if (b.isValid()) map.fitBounds(b, { padding: [8, 8] })
        } catch (_) {}
    }, [data, map])
    return null
}

function MapResizeHandler({ data }) {
    const map = useMap()
    useEffect(() => {
        const el = map.getContainer()
        if (!el) return
        const obs = new ResizeObserver(() => {
            map.invalidateSize({ animate: false })
            if (data) {
                try {
                    const b = L.geoJSON(data).getBounds()
                    if (b.isValid()) map.fitBounds(b, { padding: [8, 8] })
                } catch (_) {}
            }
        })
        obs.observe(el)
        return () => obs.disconnect()
    }, [map, data])
    return null
}

// ── Main component ─────────────────────────────────────────────────────
export default function DemographicHeatmap({ stateId, granularity, heatmapData, raceFilter }) {
    const outlineData = STATE_OUTLINE[stateId] ?? null
    const sampleData  = GEO_SAMPLES[stateId]?.[granularity] ?? null

    // Server-side binning: build idx → color for the selected race group
    const colorByIdx = {}
    if (heatmapData?.features && heatmapData?.bins) {
        const binColor = {}
        heatmapData.bins.forEach(b => { binColor[b.binId] = b.color })
        const race = raceFilter ?? 'black'
        heatmapData.features.forEach(f => {
            const binId = f[race] ?? 1
            colorByIdx[f.idx] = binColor[binId] ?? '#f0fdfa'
        })
    }

    const mapKey = `${stateId}-${granularity}-${raceFilter}`

    if (!outlineData) {
        return (
            <div className="h-full flex flex-col items-center justify-center gap-3 text-center px-6">
                <p className="text-brand-darkest font-semibold text-sm">Map Unavailable</p>
                <p className="text-brand-muted/60 text-xs leading-relaxed">
                    Geographic data for this state will be loaded from the backend.
                </p>
            </div>
        )
    }

    let counter = 0

    return (
        <MapContainer
            key={mapKey}
            center={[32.7, -86.8]}
            zoom={6}
            zoomControl
            scrollWheelZoom={false}
            doubleClickZoom={false}
            attributionControl={false}
            style={{ height: '100%', width: '100%' }}
        >
            {/* Fit to full state outline so entire state is always in frame */}
            <FitBounds data={outlineData} />
            <MapResizeHandler data={outlineData} />

            <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />

            {/* State outline — teal border, near-transparent fill */}
            <GeoJSON
                key={`outline-${stateId}`}
                data={outlineData}
                style={{ fillColor: '#f0fdfa', fillOpacity: 0.12, color: '#0d9488', weight: 1.5 }}
            />

            {/* Heatmap — color comes directly from server-assigned binId */}
            {sampleData && (
                <GeoJSON
                    key={`heat-${mapKey}`}
                    data={sampleData}
                    style={feature => {
                        const idx = feature?.properties?.idx ?? counter++
                        return {
                            fillColor:   colorByIdx[idx] ?? '#f0fdfa',
                            fillOpacity: 0.82,
                            color:       '#134e4a',
                            weight:      0.5,
                        }
                    }}
                />
            )}
        </MapContainer>
    )
}
