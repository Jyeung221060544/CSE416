/**
 * @file USMap.jsx
 * @description Splash-screen choropleth map of the contiguous 48 US states.
 *
 * PROPS
 * @prop {Function} onStateHover  - Called with a state data object on mouseover,
 *                                  or `null` on mouseout.
 *
 * STATE SOURCES
 * - stateByName  : Built from splash-states.json (keyed by stateName).
 *                  Replace with a GET /api/states response once the backend
 *                  endpoint is wired (see //CONNECT HERE markers below).
 * - usGeoJson    : Static GeoJSON asset for the 48-state boundary shapes.
 *
 * LAYOUT
 * - Full-bleed <MapContainer> (Leaflet).
 * - CartoDB light basemap tile layer.
 * - <GeoJSON> overlay: available states colored brand-primary, others muted.
 * - Hover: drop-shadow glow + darker fill; click navigates to /state/:stateId.
 *
 * ========================================================================
 * TODO – Replace Dummy Data with Real Backend API
 * ========================================================================
 *
 * CURRENT IMPLEMENTATION
 * - Imports splash-states.json (src/dummy/) to build the stateByName lookup
 * - stateByName drives which states are colored/clickable on the map
 *   (hasData), and supplies the hover payload (stateId, stateName,
 *   numDistricts, isPreclearance, center, zoom)
 * - US-48-States.geojson stays as a static asset (boundary shapes only)
 *
 * REQUIRED API CALL
 * - HTTP Method: GET
 * - Endpoint:    /api/states
 * - Purpose:     Returns the list of states that have analysis data
 *
 * RESPONSE SNAPSHOT (keys only)
 * {
 *   states: [{
 *     stateId, stateName, hasData, numDistricts, isPreclearance,
 *     center: { lat, lng },
 *     zoom
 *   }]
 * }
 *
 * INTEGRATION INSTRUCTIONS
 * - Accept the fetched states array as a prop OR fetch inside this component
 * - Rebuild stateByName from the API response: Object.fromEntries(states.map(...))
 * - The US-48-States.geojson import is static — keep it as-is
 * - Pass the hovered state object to onStateHover — no other render changes
 *
 * SEARCHABLE MARKER
 * //CONNECT HERE: splashData import + stateByName lookup
 *
 * ========================================================================
 */

/* ── Step 0: React + map library imports ──────────────────────────────── */
import { useRef, useEffect, useMemo, useCallback } from 'react'
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet'
import L from 'leaflet'
import { useNavigate } from 'react-router-dom'
import useAppStore from '../../store/useAppStore'

/* ── Step 1: Static GeoJSON boundary shapes (never changes) ───────────── */
// states prop comes from HomePage via GET /api/states — no dummy import needed
import usGeoJson from '../../assets/US-48-States.geojson'

/* ── Step 2: Base style function (accepts lookup as parameter) ─────────── */
/**
 * Returns a Leaflet path style object for a GeoJSON feature.
 * States with `hasData` receive the brand primary color;
 * all others receive the muted surface color.
 *
 * @param {object} feature     - GeoJSON feature with a `properties.name` field.
 * @param {object} stateByName - Lookup: stateName → state object from API.
 * @returns {object} Leaflet path options (fillColor, color, weight, etc.).
 */
function baseStyle(feature, stateByName) {
    const data = stateByName[feature.properties.name]

    if (data?.hasData) {
        return {
            fillColor:   'var(--color-brand-primary)',
            fillOpacity: 0.65,
            color:       '#000000',
            weight:      2.5,
            className:   'state-valid',
        }
    }

    return {
        fillColor:   'var(--color-brand-surface)',
        fillOpacity: 0.9,
        color:       'var(--color-brand-deep)',
        weight:      0.75,
        className:   'state-invalid',
    }
}

/* ── Step 4: FitBounds + MapResizeHandler helpers ─────────────────────── */

/** Fits the map to the exact GeoJSON extent on mount. */
function FitBounds({ geoData }) {
    const map = useMap()
    useEffect(() => {
        if (!geoData) return
        try {
            const bounds = L.geoJSON(geoData).getBounds()
            if (bounds.isValid()) map.fitBounds(bounds, { padding: [30, 30] })
        } catch (_) { /* ignore malformed features */ }
    }, [geoData, map])
    return null
}

/** Re-fits + invalidates whenever the container resizes. */
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
                    if (bounds.isValid()) map.fitBounds(bounds, { padding: [30, 30] })
                } catch (_) { /* ignore */ }
            }
        })
        observer.observe(container)
        return () => observer.disconnect()
    }, [map, geoData])
    return null
}

/* ── Step 5: Main USMap component ─────────────────────────────────────── */
/**
 * Renders the contiguous-48 splash map with hover/click interactions.
 *
 * @param {object}   props
 * @param {Function} props.onStateHover - Receives the hovered state object
 *                                        (or null on mouseout).
 * @returns {JSX.Element} A full-height Leaflet MapContainer.
 */
export default function USMap({ states = [], onStateHover }) {
    /* ── Step 5a: Refs, router, global state ── */
    const geoJsonRef = useRef(null)
    const navigate   = useNavigate()
    const setSelectedState = useAppStore(s => s.setSelectedState)

    /* ── Step 5a-i: Build lookup from API-fetched states ─────────────────── */
    // Rebuild whenever states array changes (i.e. after the API response arrives).
    const stateByName = useMemo(
        () => Object.fromEntries(states.map(s => [s.stateName, s])),
        [states]
    )

    /* ── Step 5a-ii: Stable style callback — updates when stateByName changes */
    const style = useCallback(
        (feature) => baseStyle(feature, stateByName),
        [stateByName]
    )

    /* ── Step 5b: Per-feature event binding ── */
    /**
     * Attaches mouseover, mouseout, and click handlers to each state layer.
     * Only states with `hasData` receive interactive behaviour.
     *
     * @param {object} feature - GeoJSON feature.
     * @param {object} layer   - Leaflet layer for the feature.
     */
    const onEachFeature = useCallback(function onEachFeature(feature, layer) {
        const data = stateByName[feature.properties.name]
        if (!data?.hasData) return

        layer.on({
            mouseover(e) {
                // Step 5b-i: Highlight the hovered state polygon
                e.target.setStyle({
                    fillColor:   'var(--color-brand-deep)',
                    fillOpacity: 0.85,
                    weight:      2.5,
                    color:       '#ffffff',
                })
                e.target.bringToFront()
                const el = e.target.getElement()
                if (el) el.style.filter = 'drop-shadow(0 0 10px var(--color-brand-glow))'
                // Step 5b-ii: Notify parent with hovered state payload
                onStateHover(data)
            },
            mouseout(e) {
                // Step 5b-iii: Reset style and clear hover payload
                geoJsonRef.current?.resetStyle(e.target)
                const el = e.target.getElement()
                if (el) el.style.filter = ''
                onStateHover(null)
            },
            click() {
                // Step 5b-iv: Navigate to the state detail page
                setSelectedState(data.stateId)
                navigate(`/state/${data.stateId}`)
            },
        })
    }, [stateByName, onStateHover, navigate, setSelectedState])

    /* ── Step 5c: Render ── */
    return (
        <MapContainer
            center={[39.5, -98.35]}
            zoom={4}
            zoomSnap={0}
            zoomControl={false}
            scrollWheelZoom={false}
            doubleClickZoom={false}
            dragging={false}
            touchZoom={false}
            attributionControl={false}
            style={{ height: '100%', width: '100%', background: '#EBF4F6' }}
        >
            {/* ── MAP UTILITIES ──────────────────────────────────────── */}
            <FitBounds geoData={usGeoJson} />
            <MapResizeHandler geoData={usGeoJson} />

            {/* ── BASE TILE LAYER ────────────────────────────────────── */}
            <TileLayer
                url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            />

            {/* ── STATE CHOROPLETH LAYER ─────────────────────────────── */}
            <GeoJSON
                key={states.length}
                ref={geoJsonRef}
                data={usGeoJson}
                style={style}
                onEachFeature={onEachFeature}
            />

        </MapContainer>
    )
}
