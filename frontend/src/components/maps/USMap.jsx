import { useRef, useEffect, useMemo, useCallback, useState } from 'react'
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet'
import L from 'leaflet'
import { useNavigate } from 'react-router-dom'
import useAppStore from '../../store/useAppStore'
import { fetchUsStatesGeo } from '../../api'
import { STATE_COLORS } from '../../lib/partyColors'

let _usGeoCache = null

/**
 * Returns a Leaflet path style for a GeoJSON feature.
 * States with `hasData` receive the brand primary color; others are muted.
 *
 * @param {object} feature     - GeoJSON feature with `properties.name`.
 * @param {object} stateByName - Lookup: stateName → state object from API.
 * @returns {object} Leaflet path options.
 */
function baseStyle(feature, stateByName) {
    const data = stateByName[feature.properties.name]

    if (data?.hasData) {
        const stateColor = STATE_COLORS[data.stateId]
        return {
            fillColor:   stateColor?.fill ?? 'var(--color-brand-primary)',
            fillOpacity: 0.75,
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

/**
 * Renders the contiguous-48 splash map with hover/click interactions.
 *
 * @param {object}   props
 * @param {Function} props.onStateHover - Receives the hovered state object (or null on mouseout).
 * @returns {JSX.Element}
 */
export default function USMap({ states = [], onStateHover }) {
    const geoJsonRef = useRef(null)
    const navigate   = useNavigate()
    const setSelectedState = useAppStore(s => s.setSelectedState)

    const [usGeoJson, setUsGeoJson] = useState(_usGeoCache)
    useEffect(() => {
        if (_usGeoCache) return
        fetchUsStatesGeo()
            .then(data => { _usGeoCache = data; setUsGeoJson(data) })
            .catch(err => console.error('[USMap] fetchUsStatesGeo error:', err))
    }, [])

    const stateByName = useMemo(
        () => Object.fromEntries(states.map(s => [s.stateName, s])),
        [states]
    )

    const style = useCallback(
        (feature) => baseStyle(feature, stateByName),
        [stateByName]
    )

    const onEachFeature = useCallback(function onEachFeature(feature, layer) {
        const data = stateByName[feature.properties.name]
        if (!data?.hasData) return

        layer.on({
            mouseover(e) {
                const stateColor = STATE_COLORS[data.stateId]
                e.target.setStyle({
                    fillColor:   stateColor?.hover ?? 'var(--color-brand-deep)',
                    fillOpacity: 0.92,
                    weight:      2.5,
                    color:       '#ffffff',
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
    }, [stateByName, onStateHover, navigate, setSelectedState])

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
            <FitBounds geoData={usGeoJson} />
            <MapResizeHandler geoData={usGeoJson} />
            <TileLayer
                url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            />
            {usGeoJson && (
                <GeoJSON
                    key={states.length}
                    ref={geoJsonRef}
                    data={usGeoJson}
                    style={style}
                    onEachFeature={onEachFeature}
                />
            )}
        </MapContainer>
    )
}
