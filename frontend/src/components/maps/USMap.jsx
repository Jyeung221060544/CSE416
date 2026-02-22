/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║  TODO – Replace splash-states.json with a real API call             ║
 * ║                                                                      ║
 * ║  Currently: imports splash-states.json to know which states have    ║
 * ║  data (hasData), their names, and their center/zoom.                ║
 * ║                                                                      ║
 * ║  Replace with:  GET /api/states                                     ║
 * ║    → returns an array of available states, each with:               ║
 * ║      { stateId, stateName, hasData, isPreclearance,                 ║
 * ║        numDistricts, center: { lat, lng }, zoom }                   ║
 * ║                                                                      ║
 * ║  Wire it: fetch on mount, store result in useState, build           ║
 * ║  `stateByName` from the response instead of the JSON import.        ║
 * ║                                                                      ║
 * ║  The US-48-States.geojson boundary file stays as a static asset —   ║
 * ║  only the per-state metadata comes from the backend.                ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 */

import { useRef, useEffect } from 'react'
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet'
import { useNavigate } from 'react-router-dom'
import useAppStore from '../../store/useAppStore'
import splashData from '../../dummy/splash-states.json'   // TODO: replace with GET /api/states
import usGeoJson from '../../assets/US-48-States.geojson'

// Lookup: stateName → splash-states object
const stateByName = Object.fromEntries(
    splashData.states.map(s => [s.stateName, s])
)

function baseStyle(feature) {
    const data = stateByName[feature.properties.name]
    if (data?.hasData) {
        return {
            fillColor: '#088395',   // brand-primary
            fillOpacity: 0.80,
            color: '#7AB2B2',       // brand-muted border
            weight: 1,
            className: 'state-valid',
        }
    }
    return {
        fillColor: '#0b2d3b',       // near-invisible on dark bg
        fillOpacity: 0.70,
        color: '#09637E',           // brand-deep border
        weight: 0.4,
        className: 'state-invalid',
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
                    fillColor:   '#7AB2B2',  // brand-muted — pops light on dark bg
                    fillOpacity: 0.95,
                    weight:      2,
                    color:       '#EBF4F6',  // brand-surface border
                })
                e.target.bringToFront()
                const el = e.target.getElement()
                if (el) el.style.filter = 'drop-shadow(0 0 14px rgba(122,178,178,0.7))'
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
            style={{ height: '100%', width: '100%', background: '#071e28' }}
        >
            <SizeInvalidator />
            <TileLayer
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
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
