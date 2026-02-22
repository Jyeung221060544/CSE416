/**
 * DemographicHeatmap
 *
 * Renders precinct or census-block polygons colored by the server-assigned
 * minority (non-white) VAP bin. The server decides bin boundaries and which
 * bin each unit belongs to — the frontend is a pure renderer.
 *
 * Data shape (from AL-heatmap-precinct.json / AL-heatmap-census.json):
 *   bins:     [{ binId, rangeMin, rangeMax, color }]   (10 teal stops)
 *   features: [{ idx, binId }]                         (no raw percentages)
 *
 * Geometry sources:
 *   precinct     → ALPrecinctMap.json  (1947 real precincts, WGS84)
 *   census_block → ALBlock-sample.json  (100 real census blocks, NW Alabama)
 *
 * TODO: Replace with backend tile endpoint once available:
 *   GET /api/states/:stateId/heatmap?granularity=precinct
 */

import { useEffect } from 'react'
import { MapContainer, GeoJSON, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'

import ALPrecinctFull from '../../assets/ALPrecinctMap.json'
import ALBlockSample  from '../../assets/ALBlockMap.json'
import ALDistricts    from '../../assets/ALCongressionalDistricts.json'
import ORDistricts    from '../../assets/ORCongressionalDistrict.json'

// ── GeoJSON lookup ─────────────────────────────────────────────────────
const STATE_OUTLINE = { AL: ALDistricts, OR: ORDistricts }

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
