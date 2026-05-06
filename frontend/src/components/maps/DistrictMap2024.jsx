import { useRef, useEffect, useCallback, useState } from 'react'
import { MapContainer, GeoJSON, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'
import useAppStore from '../../store/useAppStore'
import { fetchDistricts } from '../../api'

const districtGeoCache = {}

/**
 * Returns a Leaflet path style for a single district feature.
 * Selected district gets brand primary color; others are colored by party.
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
        return { fillColor: 'var(--color-brand-primary)', fillOpacity: 0.85, color: '#ffffff', weight: 2.5 }
    }
    if (distData?.party === 'Democratic') {
        return { fillColor: '#3B82F6', fillOpacity: 0.30, color: '#1D4ED8', weight: 1 }
    }
    if (distData?.party === 'Republican') {
        return { fillColor: '#EF4444', fillOpacity: 0.30, color: '#B91C1C', weight: 1 }
    }
    return { fillColor: '#7AB2B2', fillOpacity: 0.25, color: '#09637E', weight: 1 }
}

/**
 * Fits the map viewport to the full extent of the provided GeoJSON.
 *
 * @param {object} props
 * @param {object} props.geoData - GeoJSON FeatureCollection to fit.
 * @returns {null}
 */
function FitBounds({ geoData }) {
    const map = useMap()
    useEffect(() => {
        if (!geoData) return
        try {
            const bounds = L.geoJSON(geoData).getBounds()
            if (bounds.isValid()) map.fitBounds(bounds, { padding: [20, 20] })
        } catch (_) { /* ignore malformed features */ }
    }, [geoData, map])
    return null
}

/**
 * Watches the map container for size changes and calls invalidateSize() so
 * Leaflet reflows the tile grid and re-fits bounds.
 *
 * @param {object} props
 * @param {object} props.geoData - GeoJSON used for re-fitting after resize.
 * @returns {null}
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
                    if (bounds.isValid()) map.fitBounds(bounds, { padding: [20, 20] })
                } catch (_) { /* ignore */ }
            }
        })

        observer.observe(container)
        return () => observer.disconnect()
    }, [map, geoData])

    return null
}

/**
 * Renders the congressional district map for the given state.
 * Districts are color-coded by party; the selected district receives a
 * brand-primary highlight synced with the global Zustand store.
 *
 * @param {object} props
 * @param {string} props.stateId         - Two-letter state abbreviation.
 * @param {object} props.districtSummary - Summary metadata for each district.
 * @returns {JSX.Element}
 */
export default function DistrictMap2022({ stateId, districtSummary }) {
    const geoJsonRef           = useRef(null)
    const selectedDistrict     = useAppStore(s => s.selectedDistrict)
    const setSelectedDistrict  = useAppStore(s => s.setSelectedDistrict)
    const hoveredLayerRef      = useRef(null)

    const [geoData, setGeoData] = useState(districtGeoCache[stateId] ?? null)
    useEffect(() => {
        if (districtGeoCache[stateId]) { setGeoData(districtGeoCache[stateId]); return }
        setGeoData(null)
        fetchDistricts(stateId)
            .then(data => { districtGeoCache[stateId] = data; setGeoData(data) })
            .catch(err => console.error('[DistrictMap] fetchDistricts error:', err))
    }, [stateId])

    const districtByNumber = Object.fromEntries(
        (districtSummary?.districts ?? []).map(d => [d.districtNumber, d])
    )

    const onEachFeature = useCallback((feature, layer) => {
        const distNum = parseInt(feature.properties.CD119FP, 10)

        layer.on({
            mouseover(e) {
                if (hoveredLayerRef.current && hoveredLayerRef.current !== e.target) {
                    const prev = hoveredLayerRef.current
                    const prevEl = prev.getElement()
                    if (prevEl) prevEl.style.filter = ''
                        prev.setStyle(getStyle(prev.feature, districtByNumber, selectedDistrict))
                }
                hoveredLayerRef.current = e.target

                const el = e.target.getElement()
                if (el) el.style.filter = 'drop-shadow(0 0 10px var(--color-brand-glow))'
                e.target.setStyle({
                    fillColor: 'var(--color-brand-primary)',
                    fillOpacity: 0.85,
                    weight: 2.5,
                    color: '#ffffff',
                })
                e.target.bringToFront()
            },

            mouseout(e) {
                if (hoveredLayerRef.current === e.target) {
                    hoveredLayerRef.current = null
                }
                const el = e.target.getElement()
                const isSelected = distNum === selectedDistrict
                if (el) el.style.filter = isSelected ? 'drop-shadow(0 0 10px var(--color-brand-glow))' : ''
                e.target.setStyle(getStyle(feature, districtByNumber, selectedDistrict))
            },

            click() {
                setSelectedDistrict(distNum === selectedDistrict ? null : distNum)
            },
        })
        }, [districtByNumber, selectedDistrict, setSelectedDistrict])

    useEffect(() => {
        if (!geoJsonRef.current) return
        geoJsonRef.current.eachLayer(layer => {
            const distNum = parseInt(layer.feature.properties.CD119FP, 10)
            const el = layer.getElement()
            if (!el) return
            el.style.filter = distNum === selectedDistrict
                ? 'drop-shadow(0 0 10px var(--color-brand-glow))'
                : ''
        })
    }, [selectedDistrict])

    if (!geoData) {
        return (
            <div className="h-full flex items-center justify-center text-brand-muted/50 text-sm italic">
                Loading district map…
            </div>
        )
    }

    return (
        <MapContainer
            center={[39.5, -98.35]}
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
            <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />
            <GeoJSON
                key={`${stateId}-${selectedDistrict ?? 'none'}-${districtSummary?.districts?.length ?? 0}`}
                ref={geoJsonRef}
                data={geoData}
                style={(feature) => getStyle(feature, districtByNumber, selectedDistrict)}
                onEachFeature={onEachFeature}
            />
        </MapContainer>
    )
}
