/**
 * @file RepresentationGapMap.jsx
 * @description Leaflet district map used in the Representation Gap section.
 *   Shares the exact same base (CartoDB tiles, FitBounds, MapResizeHandler,
 *   party-color styling) as DistrictMap2024.
 *
 * PROPS
 * @prop {string} stateId          - Two-letter state abbreviation ("AL" | "OR").
 * @prop {string} plan             - Which plan to display: 'current' | 'high' | 'low'.
 * @prop {object} districtSummary  - District metadata (used for party coloring on current plan).
 * @prop {string} feasibleRace     - Selected feasible race key (reserved for future
 *                                   effective-district highlighting — no data yet).
 *
 * PLAN BEHAVIOR
 *   'current' — fetches the same district GeoJSON as DistrictMap2024 via fetchDistricts.
 *               Districts are colored by party (same getStyle logic).
 *   'high'    — same map shell; shows a "data not yet available" overlay until SeaWulf
 *               boundaries are provided.
 *   'low'     — same map shell; shows a "data not yet available" overlay until SeaWulf
 *               boundaries are provided.
 *
 * NOTE: Click/hover interaction is intentionally omitted — this is a read-only
 * comparison view, not the primary district table.
 */

import { useEffect, useState } from 'react'
import { MapContainer, GeoJSON, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'
import { fetchDistricts } from '../../api'
import {
    EFFECTIVE_FILL, EFFECTIVE_BORDER,
    NOT_EFFECTIVE_FILL, NOT_EFFECTIVE_BORDER,
} from '../../lib/partyColors'

/* ── Module-level cache shared with DistrictMap2024 ──────────────────────── */
const districtGeoCache = {} // keyed by stateId

/* ── Effectiveness style resolver ────────────────────────────────────────── */
/**
 * Colors each district green (effective) or grey (not effective) for the
 * currently selected feasible race.
 *
 * Effectiveness is derived from districtSummary.districts[].racialGroup:
 * a district is "effective" for race X when its racialGroup matches X.
 * This proxy will be replaced with an explicit effectiveness flag once
 * the backend serves that field.
 *
 * @param {object} feature          - GeoJSON feature (properties.CD119FP = district number).
 * @param {object} districtByNumber - Map: districtNumber (int) → district summary object.
 * @param {string|null} feasibleRace - Lowercase race key selected in FeasibleRaceFilter.
 */
function getEffectivenessStyle(feature, districtByNumber, feasibleRace) {
    const distNum  = parseInt(feature.properties.CD119FP, 10)
    const distData = districtByNumber[distNum]

    const isEffective = feasibleRace && distData?.racialGroup
        ? distData.racialGroup.toLowerCase() === feasibleRace.toLowerCase()
        : false

    return isEffective
        ? { fillColor: EFFECTIVE_FILL,     fillOpacity: 0.60, color: EFFECTIVE_BORDER,     weight: 1.5 }
        : { fillColor: NOT_EFFECTIVE_FILL, fillOpacity: 0.35, color: NOT_EFFECTIVE_BORDER, weight: 1   }
}

/* ── FitBounds helper (identical to DistrictMap2024) ─────────────────────── */
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

/* ── MapResizeHandler helper (identical to DistrictMap2024) ──────────────── */
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

/* ── Main component ───────────────────────────────────────────────────────── */
/**
 * @param {object} props
 * @param {string} props.stateId
 * @param {'current'|'high'|'low'} props.plan
 * @param {object} props.districtSummary
 * @param {string} props.feasibleRace  - Reserved for future effective-district highlighting.
 */
export default function RepresentationGapMap({ stateId, plan, districtSummary, feasibleRace }) {

    /* ── Fetch GeoJSON for current plan (same source as DistrictMap2024) ─── */
    const [geoData, setGeoData] = useState(
        plan === 'current' ? (districtGeoCache[stateId] ?? null) : null
    )

    useEffect(() => {
        if (plan !== 'current') return
        if (districtGeoCache[stateId]) { setGeoData(districtGeoCache[stateId]); return }
        setGeoData(null)
        fetchDistricts(stateId)
            .then(data => { districtGeoCache[stateId] = data; setGeoData(data) })
            .catch(err => console.error('[RepresentationGapMap] fetchDistricts error:', err))
    }, [stateId, plan])

    /* ── District lookup for party coloring ──────────────────────────────── */
    const districtByNumber = Object.fromEntries(
        (districtSummary?.districts ?? []).map(d => [d.districtNumber, d])
    )

    /* ── Placeholder for high/low plans (no SeaWulf data yet) ───────────── */
    const isPending = plan !== 'current'

    /* ── Shared center fallback (will be overridden by FitBounds) ────────── */
    const center = [39.5, -98.35]

    return (
        <div style={{ position: 'relative', height: '100%', width: '100%' }}>
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
                <FitBounds geoData={geoData} />
                <MapResizeHandler geoData={geoData} />

                {/* ── BASE TILE LAYER ────────────────────────────────────── */}
                <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />

                {/* ── DISTRICT LAYER (current plan only) ────────────────── */}
                {plan === 'current' && geoData && (
                    <GeoJSON
                        key={`rg-districts-${stateId}-${feasibleRace ?? 'none'}`}
                        data={geoData}
                        style={feature => getEffectivenessStyle(feature, districtByNumber, feasibleRace)}
                    />
                )}
            </MapContainer>

            {/* ── "DATA NOT YET AVAILABLE" OVERLAY (high / low plans) ──── */}
            {isPending && (
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
