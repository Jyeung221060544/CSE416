/**
 * @file DemographicHeatmap.jsx
 * @description Leaflet choropleth map that colors precincts by the concentration
 *   of a selected racial/ethnic group (race-density heatmap).
 *   Colors come from server-assigned bin IDs so the client only maps binId → hex.
 *
 * PROPS
 * @prop {string} stateId      - Two-letter state abbreviation ("AL" | "OR").
 * @prop {object} heatmapData  - Binning data from the backend:
 *   { bins: [{ binId, color }], features: [{ idx, binId }] }
 * @prop {string} raceFilter   - Currently selected race group key
 *   ("black" | "white" | "hispanic" | "asian" | "other").
 *
 * LAYOUT
 * - Full-bleed <MapContainer> (Leaflet), re-keyed on state+race.
 * - <FitBounds>       : fits to state outline on mount.
 * - <MapResizeHandler>: invalidates + re-fits on container resize.
 * - State outline GeoJSON layer (teal border, near-transparent fill).
 * - Precinct heatmap GeoJSON layer (per-feature fill from server binId color).
 */

/* ── Step 0: React + map library imports ──────────────────────────────── */
import { useEffect, useRef, useState } from 'react'
import { MapContainer, GeoJSON, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'

/* ── Step 1: GeoJSON — fetched from backend, cached per stateId ─────────── */
import { fetchDistricts, fetchPrecincts } from '../../api'
const districtOutlineCache = {} // keyed by stateId
const precinctCache        = {} // keyed by stateId

/* ── Step 3: FitBounds helper ─────────────────────────────────────────── */
/**
 * Inner Leaflet component that fits the map viewport to the extent of the
 * provided GeoJSON. Used to keep the full state in frame on first render.
 *
 * @param {object} props
 * @param {object} props.data - GeoJSON to compute bounds from.
 * @returns {null} Renders nothing — side-effect only.
 */
function FitBounds({ data }) {
    const map = useMap()
    useEffect(() => {
        if (!data) return
        try {
            const b = L.geoJSON(data).getBounds()
            if (b.isValid()) map.fitBounds(b, { padding: [60, 60] })
        } catch (_) {}
    }, [data, map])
    return null
}

/* ── Step 4: MapResizeHandler helper ─────────────────────────────────── */
/**
 * Watches the Leaflet container for ResizeObserver events and invalidates +
 * re-fits the map so the state always fills the panel after sidebar toggles.
 *
 * @param {object} props
 * @param {object} props.data - GeoJSON used for re-fitting after resize.
 * @returns {null} Renders nothing — side-effect only.
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
                    if (b.isValid()) map.fitBounds(b, { padding: [60, 60] })
                } catch (_) {}
            }
        })
        obs.observe(el)
        return () => obs.disconnect()
    }, [map, data])
    return null
}

/* ── Step 5: Main DemographicHeatmap component ────────────────────────── */
/**
 * Renders the precinct-level demographic density heatmap for a given state.
 * Each precinct is colored according to the server-assigned bin for the
 * currently selected race group.
 *
 * @param {object}        props
 * @param {string}        props.stateId      - Two-letter state abbreviation.
 * @param {object}        props.heatmapData  - Bin + feature data from the backend.
 * @param {string}        props.raceFilter   - Selected race key for color lookup.
 * @param {{ center: [number,number], zoom: number }|null} props.mapView
 *                                           - Initial map center + zoom from stateSummary.
 *                                             FitBounds overrides this after mount, so this
 *                                             only affects the brief first-render position.
 *                                             Falls back to the US center if null.
 * @returns {JSX.Element} Full-height Leaflet map or an "unavailable" fallback.
 */
export default function DemographicHeatmap({ stateId, heatmapData, raceFilter, mapView, showDistrictOverlay, districtPartyMap, isActive }) {
    /* ── Step 6a: Resolve geometry sources ── */
    const [outlineData, setOutlineData] = useState(districtOutlineCache[stateId] ?? null)
    useEffect(() => {
        if (districtOutlineCache[stateId]) { setOutlineData(districtOutlineCache[stateId]); return }
        setOutlineData(null)
        fetchDistricts(stateId)
            .then(data => { districtOutlineCache[stateId] = data; setOutlineData(data) })
            .catch(err => console.error('[DemographicHeatmap] fetchDistricts error:', err))
    }, [stateId])

    // Precinct GeoJSON (fetched from backend, cached in module scope)
    // Gated on isActive so precincts are not fetched until the Demographic section is in view.
    const [precinctData, setPrecinctData] = useState(null)
    useEffect(() => {
        if (precinctCache[stateId]) { setPrecinctData(precinctCache[stateId]); return }
        if (!isActive) return
        setPrecinctData(null)
        fetchPrecincts(stateId)
            .then(data => { precinctCache[stateId] = data; setPrecinctData(data) })
            .catch(err => console.error('[DemographicHeatmap] fetchPrecincts error:', err))
    }, [stateId, isActive])

    /* ── Step 6b: Build idx → hex color map from server bin data ── */
    // Server returns per-race features: { idx, binId } — no race key lookup needed.
    const colorByIdx = {}
    if (heatmapData?.features && heatmapData?.bins) {
        const binColor = {}
        heatmapData.bins.forEach(b => { binColor[b.binId] = b.color })
        heatmapData.features.forEach(f => {
            colorByIdx[f.idx] = binColor[f.binId] ?? '#f0fdfa'
        })
    }

    /* ── Step 6b-ii: Imperatively re-style precinct heatmap when data arrives ─
     * We do NOT change the GeoJSON key when heatmapData loads. Remounting the
     * heatmap layer after the district overlay would push the heatmap on top.
     * Instead we call layer.setStyle() on every feature via the ref. ──────── */
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
    }, [heatmapData]) // eslint-disable-line react-hooks/exhaustive-deps

    /* ── Step 6b-iii: Keep district overlay on top ────────────────────────────────
     * The precinct GeoJSON loads async and gets stacked above the district overlay
     * when it arrives. We use Leaflet's `add` event (fires when the layer actually
     * joins the map) to call bringToFront() at the right moment — not in a React
     * effect, which fires before the layer is in the Leaflet DOM. ──────────────── */
    const districtOverlayRef = useRef(null)

    /* ── Step 6c: Map re-key token (forces layer remount on param change) ── */
    const mapKey = `${stateId}-${raceFilter}`

    /* ── Step 6e: Running counter for features without an explicit idx ── */
    let counter = 0

    /* ── Step 6f: Render ── */
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
                {/* ── MAP UTILITIES ──────────────────────────────────────── */}
                <FitBounds data={outlineData} />
                <MapResizeHandler data={outlineData} />

                {/* ── BASE TILE LAYER ────────────────────────────────────── */}
                <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />

                {/* ── STATE OUTLINE LAYER ────────────────────────────────── */}
                {outlineData && (
                    <GeoJSON
                        key={`outline-${stateId}`}
                        data={outlineData}
                        style={{ fillColor: '#f0fdfa', fillOpacity: 0.12, color: '#0d9488', weight: 1.5 }}
                    />
                )}

                {/* ── PRECINCT HEATMAP LAYER ─────────────────────────────── */}
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

                {/* ── DISTRICT BOUNDARY OVERLAY ───────────────────────────── */}
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
