/**
 * @file DistrictMap2024.jsx
 * @description Interactive Leaflet map showing the congressional districts for
 *   a single state, color-coded by party affiliation. Clicking a district
 *   polygon toggles the global `selectedDistrict` store value, which
 *   cross-highlights the corresponding row in CongressionalTable.
 *
 * PROPS
 * @prop {string} stateId          - Two-letter state abbreviation ("AL" | "OR").
 * @prop {object} districtSummary  - District metadata from useStateData:
 *   { districts: [{ districtNumber, party, representative, ... }] }
 *
 * STATE SOURCES
 * - DISTRICT_GEOJSON : Static asset lookup keyed by stateId.
 *                      Replace with GET /api/states/:stateId/districts/geojson
 *                      (see //CONNECT HERE markers below).
 * - selectedDistrict : Zustand store — shared with CongressionalTable for
 *                      bi-directional cross-highlight.
 *
 * LAYOUT
 * - Full-bleed <MapContainer> (Leaflet).
 * - CartoDB light basemap.
 * - <FitBounds>       : auto-fits map viewport to full state extent on mount.
 * - <MapResizeHandler>: invalidates + re-fits when the sidebar resizes.
 * - <GeoJSON>         : re-keyed on selectedDistrict so Leaflet re-paints
 *                       highlight styles without a full remount.
 *
 * ========================================================================
 * TODO – Replace Dummy Data with Real Backend API
 * ========================================================================
 *
 * CURRENT IMPLEMENTATION
 * - Imports ALCongressionalDistricts.json and ORCongressionalDistrict.json
 *   from src/assets/ as static GeoJSON bundles
 * - Builds a DISTRICT_GEOJSON lookup keyed by stateId: { AL: ..., OR: ... }
 * - districtSummary (party, representative, etc.) comes via props from
 *   useStateData, which currently reads from dummy JSON
 *
 * REQUIRED API CALL
 * - HTTP Method: GET
 * - Endpoint:    /api/states/:stateId/districts/geojson
 * - Purpose:     Returns the GeoJSON FeatureCollection for the state's districts
 *
 * RESPONSE SNAPSHOT (keys only)
 * {
 *   type: "FeatureCollection",
 *   features: [{
 *     type: "Feature",
 *     properties: {
 *       CD119FP,    (district number as string, e.g. "01")
 *       NAMELSAD20  (e.g. "Congressional District 1")
 *     },
 *     geometry: { type, coordinates }
 *   }]
 * }
 *
 * INTEGRATION INSTRUCTIONS
 * - Fetch inside a useEffect keyed on stateId
 * - Store result in: const [geoData, setGeoData] = useState(null)
 * - Replace the DISTRICT_GEOJSON[stateId] lookup with the fetched geoData
 * - districtSummary (party coloring) still flows in via props from useStateData
 *
 * SEARCHABLE MARKER
 * //CONNECT HERE: DISTRICT_GEOJSON lookup — replace asset imports + static object
 *
 * ========================================================================
 */

/* ── Step 0: React + map library imports ──────────────────────────────── */
import { useRef, useEffect, useCallback } from 'react'
import { MapContainer, GeoJSON, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'
import useAppStore from '../../store/useAppStore'

/* ── Step 1: Static GeoJSON assets (replace with API fetch) ───────────── */
//CONNECT HERE: DISTRICT_GEOJSON — delete these asset imports and the static lookup below,
// then fetch from GET /api/states/:stateId/districts/geojson in a useEffect
import ALDistricts from '../../assets/ALCongressionalDistricts.json'
import ORDistricts from '../../assets/ORCongressionalDistrict.json'

/* ── Step 2: Static lookup — replace with useState populated by fetch ─── */
//CONNECT HERE: DISTRICT_GEOJSON — replace with useState(null) populated by the fetch above
const DISTRICT_GEOJSON = { AL: ALDistricts, OR: ORDistricts }

/* ── Step 3: District style resolver ─────────────────────────────────── */
/**
 * Returns a Leaflet path style for a single district feature.
 * Selected district gets the brand primary color; others are colored by party.
 *
 * @param {object} feature          - GeoJSON feature (properties.CD119FP holds the district number).
 * @param {object} districtByNumber - Map from district number (int) → district summary object.
 * @param {number|null} selectedDistrict - Currently selected district number, or null.
 * @returns {object} Leaflet path options.
 */
function getStyle(feature, districtByNumber, selectedDistrict) {
    const distNum  = parseInt(feature.properties.CD119FP, 10)
    const distData = districtByNumber[distNum]
    const isSelected = distNum === selectedDistrict

    if (isSelected) {
        return { fillColor: 'var(--color-brand-primary)', fillOpacity: 0.75, color: 'var(--color-brand-darkest)', weight: 3 }
    }
    if (distData?.party === 'Democratic') {
        return { fillColor: '#3B82F6', fillOpacity: 0.30, color: '#1D4ED8', weight: 1 }
    }
    if (distData?.party === 'Republican') {
        return { fillColor: '#EF4444', fillOpacity: 0.30, color: '#B91C1C', weight: 1 }
    }
    return { fillColor: '#7AB2B2', fillOpacity: 0.25, color: '#09637E', weight: 1 }
}

/* ── Step 4: FitBounds helper ─────────────────────────────────────────── */
/**
 * Inner Leaflet component that fits the map viewport to the full extent of
 * the provided GeoJSON so the entire state is always visible regardless of
 * container height.
 *
 * @param {object} props
 * @param {object} props.geoData - GeoJSON FeatureCollection to fit.
 * @returns {null} Renders nothing — side-effect only.
 */
function FitBounds({ geoData }) {
    const map = useMap()
    useEffect(() => {
        if (!geoData) return
        try {
            const bounds = L.geoJSON(geoData).getBounds()
            if (bounds.isValid()) map.fitBounds(bounds, { padding: [4, 4] })
        } catch (_) { /* ignore malformed features */ }
    }, [geoData, map])
    return null
}

/* ── Step 5: MapResizeHandler helper ─────────────────────────────────── */
/**
 * Watches the map container for size changes (e.g. sidebar collapse) and
 * calls invalidateSize() so Leaflet reflows the tile grid and re-fits bounds
 * to keep the full state in view.
 *
 * @param {object} props
 * @param {object} props.geoData - GeoJSON used for re-fitting after resize.
 * @returns {null} Renders nothing — side-effect only.
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
                    if (bounds.isValid()) map.fitBounds(bounds, { padding: [4, 4] })
                } catch (_) { /* ignore */ }
            }
        })

        observer.observe(container)
        return () => observer.disconnect()
    }, [map, geoData])

    return null
}

/* ── Step 6: Main DistrictMap2022 component ───────────────────────────── */
/**
 * Renders the congressional district map for the given state.
 * Districts are color-coded by party; the selected district receives a
 * brand-primary highlight synced with the global Zustand store.
 *
 * @param {object} props
 * @param {string} props.stateId         - Two-letter state abbreviation.
 * @param {object} props.districtSummary - Summary metadata for each district.
 * @returns {JSX.Element} Full-height Leaflet map or a "not available" fallback.
 */
export default function DistrictMap2022({ stateId, districtSummary }) {
    /* ── Step 6a: Refs and global store ── */
    const geoJsonRef           = useRef(null)
    const selectedDistrict     = useAppStore(s => s.selectedDistrict)
    const setSelectedDistrict  = useAppStore(s => s.setSelectedDistrict)

    /* ── Step 6b: Resolve GeoJSON for the current state ── */
    const geoData = DISTRICT_GEOJSON[stateId]

    if (!geoData) {
        return (
            <div className="h-full flex items-center justify-center text-brand-muted/50 text-sm italic">
                No district map available for this state.
            </div>
        )
    }

    /* ── Step 6c: Build district number → summary lookup ── */
    // Build lookup: districtNumber (int) → district summary row
    const districtByNumber = Object.fromEntries(
        (districtSummary?.districts ?? []).map(d => [d.districtNumber, d])
    )

    /* ── Step 6d: Per-feature event binding (memoized) ── */
    /**
     * Attaches hover and click handlers to each district polygon layer.
     *
     * @param {object} feature - GeoJSON feature.
     * @param {object} layer   - Leaflet vector layer.
     */
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const onEachFeature = useCallback((feature, layer) => {
        const distNum = parseInt(feature.properties.CD119FP, 10)

        layer.on({
            mouseover(e) {
                // Apply hover glow effect
                const el = e.target.getElement()
                if (el) el.style.filter = 'drop-shadow(0 4px 8px rgba(0,0,0,0.35))'
                e.target.setStyle({
                    fillColor:   'var(--color-brand-deep)',
                    fillOpacity: 0.85,
                    weight:      3.5,
                    color:       'var(--color-brand-darkest)',
                })
                if (el) el.style.filter = 'drop-shadow(0 0 10px var(--color-brand-glow))'
                e.target.bringToFront()
            },
            mouseout(e) {
                // Restore base style (avoids stale closure by re-reading from feature)
                const el = e.target.getElement()
                if (el) el.style.filter = ''
                // Re-apply base style (avoids stale closure by re-reading from feature)
                e.target.setStyle(getStyle(feature, districtByNumber, selectedDistrict))
            },
            click() {
                // Toggle selection: clicking an already-selected district deselects
                setSelectedDistrict(distNum === selectedDistrict ? null : distNum)
            },
        })
    }, [districtByNumber, selectedDistrict, setSelectedDistrict])

    /* ── Step 6e: Render ── */
    return (
        <MapContainer
            center={[39.5, -98.35]}
            zoom={4}
            zoomControl
            scrollWheelZoom={false}
            doubleClickZoom={false}
            attributionControl={false}
            style={{ height: '100%', width: '100%' }}
        >
            {/* ── MAP UTILITIES ──────────────────────────────────────── */}
            {/* Auto-fits to full state extent on load */}
            <FitBounds geoData={geoData} />

            {/* Re-fits + invalidates on sidebar resize */}
            <MapResizeHandler geoData={geoData} />

            {/* ── BASE TILE LAYER ────────────────────────────────────── */}
            {/* Light basemap for geographic context */}
            <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />

            {/* ── DISTRICT CHOROPLETH LAYER ──────────────────────────── */}
            {/* Re-keyed on selectedDistrict so Leaflet re-applies styles on highlight */}
            <GeoJSON
                key={`${stateId}-${selectedDistrict ?? 'none'}`}
                ref={geoJsonRef}
                data={geoData}
                style={(feature) => getStyle(feature, districtByNumber, selectedDistrict)}
                onEachFeature={onEachFeature}
            />
        </MapContainer>
    )
}
