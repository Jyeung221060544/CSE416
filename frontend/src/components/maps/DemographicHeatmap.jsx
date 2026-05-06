import { useEffect, useRef, useState } from 'react'
import { MapContainer, GeoJSON, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'

import { fetchDistricts, fetchPrecincts } from '../../api'
const districtOutlineCache = {}
const precinctCache        = {}

/**
 * Fits the map viewport to the bounds of the given GeoJSON data.
 * @param {object} data - GeoJSON FeatureCollection to fit the map to.
 */
function FitBounds({ data }) {
    const map = useMap()
    useEffect(() => {
        if (!data) return
        try {
            const b = L.geoJSON(data).getBounds()
            if (b.isValid()) map.fitBounds(b, { padding: [40, 40] })
        } catch (_) {}
    }, [data, map])
    return null
}

/**
 * Observes container resize events and invalidates the map size accordingly.
 * @param {object} data - GeoJSON FeatureCollection used to re-fit bounds on resize.
 */
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
                    if (b.isValid()) map.fitBounds(b, { padding: [40, 40] })
                } catch (_) {}
            }
        })
        obs.observe(el)
        return () => obs.disconnect()
    }, [map, data])
    return null
}

/**
 * Renders a Leaflet map with a demographic heatmap layer at the precinct level,
 * an optional district boundary overlay, and party-colored district outlines.
 * @param {string} stateId - State identifier used to fetch district/precinct data.
 * @param {object} heatmapData - Bin/feature data used to color precincts.
 * @param {string} raceFilter - Selected race filter; used as part of the map key.
 * @param {{center: number[], zoom: number}} mapView - Initial map center and zoom.
 * @param {boolean} showDistrictOverlay - Whether to render party-colored district borders.
 * @param {object} districtPartyMap - Map of district number → party string.
 * @param {boolean} isActive - Whether this tab is active; defers precinct fetch until true.
 */
export default function DemographicHeatmap({ stateId, heatmapData, raceFilter, mapView, showDistrictOverlay, districtPartyMap, isActive }) {
    // Step 0: Load district outlines (cached per state)
    const [outlineData, setOutlineData] = useState(districtOutlineCache[stateId] ?? null)
    useEffect(() => {
        if (districtOutlineCache[stateId]) { setOutlineData(districtOutlineCache[stateId]); return }
        setOutlineData(null)
        fetchDistricts(stateId)
            .then(data => { districtOutlineCache[stateId] = data; setOutlineData(data) })
            .catch(err => console.error('[DemographicHeatmap] fetchDistricts error:', err))
    }, [stateId])

    // Step 1: Load precinct GeoJSON (cached per state, deferred until tab is active)
    const [precinctData, setPrecinctData] = useState(null)
    useEffect(() => {
        if (precinctCache[stateId]) { setPrecinctData(precinctCache[stateId]); return }
        if (!isActive) return
        setPrecinctData(null)
        fetchPrecincts(stateId)
            .then(data => { precinctCache[stateId] = data; setPrecinctData(data) })
            .catch(err => console.error('[DemographicHeatmap] fetchPrecincts error:', err))
    }, [stateId, isActive])

    // Step 2: Build idx → color lookup from heatmap bin data
    const colorByIdx = {}
    if (heatmapData?.features && heatmapData?.bins) {
        const binColor = {}
        heatmapData.bins.forEach(b => { binColor[b.binId] = b.color })
        heatmapData.features.forEach(f => {
            colorByIdx[f.idx] = binColor[f.binId] ?? '#f0fdfa'
        })
    }

    // Step 3: Imperatively restyle precinct layer when heatmap data changes
    const heatmapLayerRef = useRef(null)
    useEffect(() => {
        if (!heatmapLayerRef.current || !heatmapData) return
        let counter = 0
        heatmapLayerRef.current.eachLayer(layer => {
            const idx = layer.feature?.properties?.idx ?? counter++
            layer.setStyle({
                fillColor:   colorByIdx[idx] ?? '#f0fdfa',
                fillOpacity: 0.82,
                color:       '#134e4a',
                weight:      0.5,
            })
        })
    }, [heatmapData])

    const districtOverlayRef = useRef(null)
    const mapKey = `${stateId}-${raceFilter}`
    let counter = 0

    // Step 4: Render map with tile layer, precinct heatmap, and optional district overlays
    return (
        <div style={{ position: 'relative', height: '100%', width: '100%' }}>
            <MapContainer
                key={mapKey}
                center={mapView?.center ?? [39.5, -98.35]}
                zoom={mapView?.zoom ?? 5}
                zoomSnap={0}
                zoomControl
                scrollWheelZoom={false}
                doubleClickZoom={false}
                attributionControl={false}
                style={{ height: '100%', width: '100%' }}
            >
                <FitBounds data={outlineData} />
                <MapResizeHandler data={outlineData} />

                <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />

                {outlineData && (
                    <GeoJSON
                        key={`outline-${stateId}`}
                        data={outlineData}
                        style={{ fillColor: '#f0fdfa', fillOpacity: 0.12, color: '#0d9488', weight: 1.5 }}
                    />
                )}

                {precinctData && (
                    <GeoJSON
                        key={`heat-${mapKey}`}
                        ref={heatmapLayerRef}
                        data={precinctData}
                        eventHandlers={{ add: () => districtOverlayRef.current?.bringToFront() }}
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

                {showDistrictOverlay && outlineData && (
                    <GeoJSON
                        key={`district-overlay-${stateId}-${showDistrictOverlay}`}
                        ref={districtOverlayRef}
                        data={outlineData}
                        style={feature => {
                            const districtNum = parseInt(feature?.properties?.CD119FP ?? '0', 10)
                            const party = districtPartyMap?.[districtNum]
                            const color = party === 'Democratic' ? '#3b82f6'
                                        : party === 'Republican' ? '#ef4444'
                                        : '#94a3b8'
                            return { fillOpacity: 0, color, weight: 2.5, opacity: 0.9 }
                        }}
                    />
                )}
            </MapContainer>
        </div>
    )
}
