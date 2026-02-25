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
import { useRef, useEffect } from 'react'
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet'
import { useNavigate } from 'react-router-dom'
import useAppStore from '../../store/useAppStore'

/* ── Step 1: Data sources (dummy — replace with API) ──────────────────── */
//CONNECT HERE: splashData import — replace with fetched states from GET /api/states,
// then rebuild stateByName from the response array instead of the JSON import
import splashData from '../../dummy/splash-states.json'
import usGeoJson from '../../assets/US-48-States.geojson'

/* ── Step 2: State lookup table ───────────────────────────────────────── */
// Lookup: stateName → splash-states object
//CONNECT HERE: stateByName — rebuild this from the API response array
const stateByName = Object.fromEntries(
    splashData.states.map(s => [s.stateName, s])
)

/* ── Step 3: Base style function ──────────────────────────────────────── */
/**
 * Returns a Leaflet path style object for a GeoJSON feature.
 * States with `hasData` receive the brand primary color;
 * all others receive the muted surface color.
 *
 * @param {object} feature - GeoJSON feature with a `properties.name` field.
 * @returns {object} Leaflet path options (fillColor, color, weight, etc.).
 */
function baseStyle(feature) {
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

/* ── Step 4: Map size invalidator helper ──────────────────────────────── */
// Bounding box that contains all 48 contiguous US states
const US_BOUNDS = [[24.5, -125.0], [49.4, -66.9]]

/**
 * Inner Leaflet component that forces the map to recalculate its size and
 * re-fit the US bounds whenever the container is resized.
 *
 * @returns {null} Renders nothing — side-effect only.
 */
function SizeInvalidator() {
    const map = useMap()
    useEffect(() => {
        const fit = () => { map.invalidateSize(); map.fitBounds(US_BOUNDS) }
        fit()
        const observer = new ResizeObserver(fit)
        observer.observe(map.getContainer())
        return () => observer.disconnect()
    }, [map])
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
export default function USMap({ onStateHover }) {
    /* ── Step 5a: Refs, router, global state ── */
    const geoJsonRef = useRef(null)
    const navigate   = useNavigate()
    const setSelectedState = useAppStore(s => s.setSelectedState)

    /* ── Step 5b: Per-feature event binding ── */
    /**
     * Attaches mouseover, mouseout, and click handlers to each state layer.
     * Only states with `hasData` receive interactive behaviour.
     *
     * @param {object} feature - GeoJSON feature.
     * @param {object} layer   - Leaflet layer for the feature.
     */
    function onEachFeature(feature, layer) {
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
    }

    /* ── Step 5c: Render ── */
    return (
        <MapContainer
            bounds={US_BOUNDS}
            zoom={4}
            zoomControl={false}
            scrollWheelZoom={false}
            doubleClickZoom={false}
            dragging={false}
            touchZoom={false}
            attributionControl={false}
            style={{ height: '100%', width: '100%', background: '#EBF4F6' }}
        >
            {/* ── MAP UTILITIES ──────────────────────────────────────── */}
            <SizeInvalidator />

            {/* ── BASE TILE LAYER ────────────────────────────────────── */}
            <TileLayer
                url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            />

            {/* ── STATE CHOROPLETH LAYER ─────────────────────────────── */}
            <GeoJSON
                ref={geoJsonRef}
                data={usGeoJson}
                style={baseStyle}
                onEachFeature={onEachFeature}
            />
        </MapContainer>
    )
}
