/**
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

import { useRef, useEffect, useCallback } from 'react'
import { MapContainer, GeoJSON, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'
import useAppStore from '../../store/useAppStore'
//CONNECT HERE: DISTRICT_GEOJSON — delete these asset imports and the static lookup below,
// then fetch from GET /api/states/:stateId/districts/geojson in a useEffect
import ALDistricts from '../../assets/ALCongressionalDistricts.json'
import ORDistricts from '../../assets/ORCongressionalDistrict.json'

// ── Static lookups ────────────────────────────────────────────────────
//CONNECT HERE: DISTRICT_GEOJSON — replace with useState(null) populated by the fetch above
const DISTRICT_GEOJSON = { AL: ALDistricts, OR: ORDistricts }

// ── Styles ────────────────────────────────────────────────────────────
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

// Fits the map viewport to the full extent of the GeoJSON so the
// entire state is always visible regardless of container height.
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

// Watches the map container for size changes (e.g. sidebar collapse)
// and calls invalidateSize() so Leaflet reflows the tile grid and
// re-fits the bounds to keep the full state in view.
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

// ── Component ─────────────────────────────────────────────────────────
export default function DistrictMap2022({ stateId, districtSummary }) {
    const geoJsonRef           = useRef(null)
    const selectedDistrict     = useAppStore(s => s.selectedDistrict)
    const setSelectedDistrict  = useAppStore(s => s.setSelectedDistrict)

    const geoData = DISTRICT_GEOJSON[stateId]

    if (!geoData) {
        return (
            <div className="h-full flex items-center justify-center text-brand-muted/50 text-sm italic">
                No district map available for this state.
            </div>
        )
    }

    // Build lookup: districtNumber (int) → district summary row
    const districtByNumber = Object.fromEntries(
        (districtSummary?.districts ?? []).map(d => [d.districtNumber, d])
    )

    // eslint-disable-next-line react-hooks/rules-of-hooks
    const onEachFeature = useCallback((feature, layer) => {
        const distNum = parseInt(feature.properties.CD119FP, 10)

        layer.on({
            mouseover(e) {
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
                const el = e.target.getElement()
                if (el) el.style.filter = ''
                // Re-apply base style (avoids stale closure by re-reading from feature)
                e.target.setStyle(getStyle(feature, districtByNumber, selectedDistrict))
            },
            click() {
                setSelectedDistrict(distNum === selectedDistrict ? null : distNum)
            },
        })
    }, [districtByNumber, selectedDistrict, setSelectedDistrict])

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
            {/* Auto-fits to full state extent on load */}
            <FitBounds geoData={geoData} />

            {/* Re-fits + invalidates on sidebar resize */}
            <MapResizeHandler geoData={geoData} />

            {/* Light basemap for geographic context */}
            <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />

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
