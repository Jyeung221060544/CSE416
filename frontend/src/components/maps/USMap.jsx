/**
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

import { useRef, useEffect } from 'react'
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet'
import { useNavigate } from 'react-router-dom'
import useAppStore from '../../store/useAppStore'
//CONNECT HERE: splashData import — replace with fetched states from GET /api/states,
// then rebuild stateByName from the response array instead of the JSON import
import splashData from '../../dummy/splash-states.json'
import usGeoJson from '../../assets/US-48-States.geojson'

// Lookup: stateName → splash-states object
//CONNECT HERE: stateByName — rebuild this from the API response array
const stateByName = Object.fromEntries(
    splashData.states.map(s => [s.stateName, s])
)

function baseStyle(feature) {
    const data = stateByName[feature.properties.name]

    if (data?.hasData) {
        return {
            fillColor:   'var(--color-brand-primary)',
            fillOpacity: 0.65,
            color:       'var(--color-brand-darkest)',
            weight:      2.5,
            className:   'state-valid',
        }
    }

    return {
        fillColor:   'var(--color-brand-surface)',
        fillOpacity: 0.9,
        color:       'var(--color-brand-deep)',
        weight:      1,
        className:   'state-invalid',
    }
}

// Forces map to recalculate its size after first render
function SizeInvalidator() {
    const map = useMap()
    useEffect(() => {
        const t = setTimeout(() => map.invalidateSize(), 50)
        return () => clearTimeout(t)
    }, [map])
    return null
}

export default function USMap({ onStateHover }) {
    const geoJsonRef = useRef(null)
    const navigate   = useNavigate()
    const setSelectedState = useAppStore(s => s.setSelectedState)

    function onEachFeature(feature, layer) {
        const data = stateByName[feature.properties.name]
        if (!data?.hasData) return

        layer.on({
            mouseover(e) {
                e.target.setStyle({
                    fillColor:   'var(--color-brand-deep)',
                    fillOpacity: 0.85,
                    weight:      3.5,
                    color:       'var(--color-brand-darkest)',
                })
                e.target.bringToFront()
                const el = e.target.getElement()
                if (el) el.style.filter = 'drop-shadow(0 0 10px var(--color-brand-glow))'
                onStateHover(data)
            },
            mouseout(e) {
                geoJsonRef.current?.resetStyle(e.target)
                const el = e.target.getElement()
                if (el) el.style.filter = ''
                onStateHover(null)
            },
            click() {
                setSelectedState(data.stateId)
                navigate(`/state/${data.stateId}`)
            },
        })
    }

    return (
        <MapContainer
            center={[39.5, -98.35]}
            zoom={4}
            zoomControl={false}
            scrollWheelZoom={false}
            doubleClickZoom={false}
            dragging={false}
            touchZoom={false}
            attributionControl={false}
            style={{ height: '100%', width: '100%', background: '#EBF4F6' }}
        >
            <SizeInvalidator />
            <TileLayer
                url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            />
            <GeoJSON
                ref={geoJsonRef}
                data={usGeoJson}
                style={baseStyle}
                onEachFeature={onEachFeature}
            />
        </MapContainer>
    )
}
