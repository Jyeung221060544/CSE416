/**
 * BoxWhiskerChart.jsx — SVG box & whisker chart for ensemble district analysis.
 *
 * LAYOUT (per chart instance)
 *   ┌────────────────────────────────────────────────────────────┐
 *   │  Legend row: [IQR box] [─ Median] [● Mean] [● Enacted]    │
 *   ├────────────────────────────────────────────────────────────┤
 *   │  SVG chart area (responsive via ResizeObserver)            │
 *   │    Y-axis: Group VAP %                                     │
 *   │    X-axis: Indexed Districts (sorted ascending by group %) │
 *   │    Per district:                                           │
 *   │      · Box (q1→q3)  · Median line  · Whiskers (min/max)   │
 *   │      · Mean dot (amber)  · Enacted dot (brand purple)      │
 *   └────────────────────────────────────────────────────────────┘
 *
 * PROPS
 *   districts        {Array}       — Box plot rows from boxWhisker.ensembles[].groupDistricts[race].
 *                                    Each row: { index, min, q1, median, mean, q3, max }.
 *   enactedDistricts {Array|null}  — From boxWhisker.enactedPlan.groupDistricts[race].
 *                                    Each row: { index, districtId, groupVapPercentage }.
 *   raceName         {string}      — Display name for legend + axis label (e.g. "Black").
 *   chartId          {string}      — Unique suffix for SVG gradient IDs (avoid collisions).
 *   sharedYMax       {number}      — Shared y-axis ceiling so both charts align vertically.
 *   className        {string}      — Optional height Tailwind class.
 */

import { useRef, useEffect, useState, useMemo } from 'react'
import * as d3 from 'd3'
import { AXIS_COLOR, LABEL_COLOR } from '@/lib/partyColors'


/* ── Step 0: Color constants ─────────────────────────────────────────────── */

const BOX_FILL     = '#dbeafe'   // blue-100  — IQR rectangle fill
const BOX_STROKE   = '#2563eb'   // blue-600  — IQR rectangle + whisker stroke
const MEDIAN_CLR   = '#1e40af'   // blue-800  — median line inside box
const MEAN_CLR     = '#f59e0b'   // amber-500 — mean dot ("Average for the district")
const ENACTED_COLOR = '#ec4899'  // pink-500  — enacted plan dot
const GRID_CLR    = '#dce8f0'   // same grid color as EnsembleSplitChart


/* ── Step 1: Chart margin convention (matches EnsembleSplitChart margins) ── */

const MARGIN = { top: 30, right: 22, bottom: 62, left: 74 }


/* ── Step 2: Responsive size hook (ResizeObserver on container div) ─────── */

/**
 * useContainerSize — Observes a div ref and returns its current { width, height }.
 *
 * Triggers a re-render whenever the container is resized so the SVG redraws
 * without a page reload.  Disconnects the observer on unmount.
 *
 * @param {React.RefObject<HTMLDivElement>} ref
 * @returns {{ width: number, height: number }}
 */
function useContainerSize(ref) {
    const [size, setSize] = useState({ width: 0, height: 0 })
    useEffect(() => {
        if (!ref.current) return
        const obs = new ResizeObserver(entries => {
            const { width, height } = entries[0].contentRect
            setSize({ width, height })
        })
        obs.observe(ref.current)
        return () => obs.disconnect()
    }, [ref])
    return size
}


/* ── Step 3: Background gradient layer ──────────────────────────────────── */

/**
 * BgRect — Soft gradient rectangle that fills the chart plot area.
 *
 * Uses a unique gradient ID per instance to prevent cross-chart bleed
 * when two BoxWhiskerChart instances share the same DOM.
 *
 * @param {{ innerWidth, innerHeight, chartId }} props
 */
function BgRect({ innerWidth, innerHeight, chartId }) {
    const gradId = `bwBg_${chartId}`
    return (
        <g>
            <defs>
                <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#eef6ff" />
                    <stop offset="100%" stopColor="#f8fafc" />
                </linearGradient>
            </defs>
            <rect width={innerWidth} height={innerHeight} fill={`url(#${gradId})`} rx={6} />
            <rect width={innerWidth} height={innerHeight} fill="none" stroke="#b6cfdf" strokeWidth={1.5} rx={6} />
        </g>
    )
}


/* ── Step 4: Hover tooltip ───────────────────────────────────────────────── */

/**
 * Tooltip — Positioned HTML div showing district stats on hover.
 *
 * Absolute-positioned inside the chart container div so it renders above the SVG.
 * Always visible above the cursor; clamped left/right so it stays within view.
 *
 * @param {{ district, enactedDistricts, x, y }} props
 *   district         — The hovered district box-plot row (null when nothing hovered).
 *   enactedDistricts — Enacted plan array for dot lookup.
 *   x, y             — Mouse position relative to the container div.
 */
function Tooltip({ district, enactedDistricts, x, y }) {
    if (!district) return null
    const d   = district
    const fmt = v => `${(v * 100).toFixed(1)}%`
    const enacted = enactedDistricts?.find(e => e.index === d.index)
    return (
        <div style={{
            position: 'absolute', left: x + 14, top: Math.max(4, y - 200),
            background: 'white', border: `2px solid ${BOX_STROKE}`, borderRadius: 8,
            padding: '8px 12px', boxShadow: '0 4px 16px rgba(0,0,0,0.13)',
            fontSize: 12, lineHeight: 1.75, pointerEvents: 'none', zIndex: 50, minWidth: 164,
        }}>
            <div style={{ color: BOX_STROKE, fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>
                District {d.index}
            </div>
            <div style={{ color: '#475569' }}>Max:    <strong style={{ color: LABEL_COLOR }}>{fmt(d.max)}</strong></div>
            <div style={{ color: '#475569' }}>Q3:     <strong style={{ color: LABEL_COLOR }}>{fmt(d.q3)}</strong></div>
            <div style={{ color: '#475569' }}>Median: <strong style={{ color: MEDIAN_CLR  }}>{fmt(d.median)}</strong></div>
            <div style={{ color: '#475569' }}>Mean:   <strong style={{ color: MEAN_CLR    }}>{fmt(d.mean)}</strong></div>
            <div style={{ color: '#475569' }}>Q1:     <strong style={{ color: LABEL_COLOR }}>{fmt(d.q1)}</strong></div>
            <div style={{ color: '#475569' }}>Min:    <strong style={{ color: LABEL_COLOR }}>{fmt(d.min)}</strong></div>
            {enacted && (
                <div style={{ color: '#475569', marginTop: 2, borderTop: '1px solid #e2e8f0', paddingTop: 2 }}>
                    Enacted: <strong style={{ color: ENACTED_COLOR }}>{fmt(enacted.groupVapPercentage)}</strong>
                    <span style={{ color: '#94a3b8', fontSize: 10 }}> ({enacted.districtId})</span>
                </div>
            )}
        </div>
    )
}


/* ── Step 5: Main component ──────────────────────────────────────────────── */

/**
 * BoxWhiskerChart — Responsive SVG box & whisker chart for one ensemble.
 *
 * @param {{
 *   districts:        Array<{ index, min, q1, median, mean, q3, max }>,
 *   enactedDistricts: Array<{ index, districtId, groupVapPercentage }>|null,
 *   raceName:         string,
 *   chartId:          string,
 *   sharedYMax:       number|undefined,
 *   className:        string|undefined,
 * }} props
 *
 * @returns {JSX.Element}
 */
export default function BoxWhiskerChart({
    districts,
    enactedDistricts,
    raceName    = 'Group',
    chartId     = 'bw',
    sharedYMax,
    className,
}) {

    /* ── Step 5a: Container size via ResizeObserver ──────────────────────── */
    const containerRef = useRef(null)
    const { width, height } = useContainerSize(containerRef)

    /* ── Step 5b: Hover tooltip state ────────────────────────────────────── */
    const [hovered, setHovered] = useState({ district: null, x: 0, y: 0 })

    /* ── Step 5c: Derived inner dimensions ───────────────────────────────── */
    const innerW = Math.max(0, width  - MARGIN.left - MARGIN.right)
    const innerH = Math.max(0, height - MARGIN.top  - MARGIN.bottom)

    /* ── Step 5d: D3 band scale — x maps each district index to a pixel x ── */
    const xScale = useMemo(() => {
        if (!innerW || !districts?.length) return null
        return d3.scaleBand()
            .domain(districts.map(d => d.index))
            .range([0, innerW])
            .padding(0.35)
    }, [innerW, districts])

    /* ── Step 5e: D3 linear scale — y maps 0–yMax to pixel y (inverted) ── */
    const yScale = useMemo(() => {
        if (!innerH) return null
        const yMax = sharedYMax ?? 1.0
        return d3.scaleLinear()
            .domain([0, yMax])
            .range([innerH, 0])
    }, [innerH, sharedYMax])

    /* ── Step 5f: Y-axis ticks (D3 nice tick generation) ─────────────────── */
    const yTicks = useMemo(() => (yScale ? yScale.ticks(8) : []), [yScale])

    /* ── Step 5g: Empty state guard ──────────────────────────────────────── */
    if (!districts?.length) {
        return (
            <div className={`w-full rounded-xl border border-dashed border-brand-muted/30 bg-brand-surface/20 flex items-center justify-center ${className ?? 'h-[360px]'}`}>
                <p className="text-brand-muted/50 text-sm italic">No data available</p>
            </div>
        )
    }

    /* ── Step 5h: Mouse-move handler (computes position relative to SVG container) */
    function handleMouseMove(e, d) {
        if (!containerRef.current) return
        const rect = containerRef.current.getBoundingClientRect()
        setHovered({ district: d, x: e.clientX - rect.left, y: e.clientY - rect.top })
    }


    /* ── Step 5i: Render ─────────────────────────────────────────────────── */
    return (
        <div className={`w-full rounded-xl border border-brand-muted/25 shadow-sm bg-white flex flex-col ${className ?? 'h-[360px]'}`}>

            {/* ── LEGEND ROW ─────────────────────────────────────────────── */}
            <div className="flex flex-wrap items-center gap-4 px-4 pt-3 pb-1 flex-shrink-0">

                {/* IQR box with median */}
                <div className="flex items-center gap-1.5">
                    <svg width="22" height="14">
                        <rect x="1" y="1" width="20" height="12" fill={BOX_FILL} stroke={BOX_STROKE} strokeWidth={1.5} rx={2} />
                        <line x1="1" y1="7" x2="21" y2="7" stroke={MEDIAN_CLR} strokeWidth={2.5} />
                    </svg>
                    <span style={{ fontSize: 12, fontWeight: 600, color: LABEL_COLOR }}>IQR (Q1–Q3)</span>
                </div>

                {/* Mean dot */}
                <div className="flex items-center gap-1.5">
                    <svg width="12" height="12">
                        <circle cx="6" cy="6" r="5" fill={MEAN_CLR} stroke="white" strokeWidth={1} />
                    </svg>
                    <span style={{ fontSize: 12, fontWeight: 600, color: LABEL_COLOR }}>Mean</span>
                </div>

                {/* Enacted plan dot */}
                <div className="flex items-center gap-1.5">
                    <svg width="12" height="12">
                        <circle cx="6" cy="6" r="5" fill={ENACTED_COLOR} stroke="white" strokeWidth={1} />
                    </svg>
                    <span style={{ fontSize: 12, fontWeight: 600, color: ENACTED_COLOR }}>Enacted</span>
                </div>

                {/* Right-aligned race label */}
                <span className="ml-auto text-[11px] font-semibold text-slate-500 opacity-70 select-none">
                    {raceName} VAP %
                </span>
            </div>

            {/* ── SVG CHART AREA ─────────────────────────────────────────── */}
            {/* Container ref for ResizeObserver + tooltip positioning */}
            <div
                ref={containerRef}
                className="flex-1 min-h-0 relative"
                onMouseLeave={() => setHovered({ district: null, x: 0, y: 0 })}
            >
                {/* Tooltip (absolutely positioned HTML div) */}
                <Tooltip
                    district={hovered.district}
                    enactedDistricts={enactedDistricts}
                    x={hovered.x}
                    y={hovered.y}
                />

                {/* Only render SVG once dimensions are known */}
                {width > 0 && height > 0 && xScale && yScale && (
                    <svg width={width} height={height} style={{ display: 'block' }}>
                        <g transform={`translate(${MARGIN.left},${MARGIN.top})`}>

                            {/* ── Background gradient + border ─────────── */}
                            <BgRect innerWidth={innerW} innerHeight={innerH} chartId={chartId} />

                            {/* ── Y-axis grid lines ─────────────────────── */}
                            {yTicks.map(t => {
                                const py = yScale(t)
                                return (
                                    <line
                                        key={`grid-${t}`}
                                        x1={0} y1={py} x2={innerW} y2={py}
                                        stroke={GRID_CLR} strokeWidth={1} strokeDasharray="3 4"
                                    />
                                )
                            })}

                            {/* ── Y-axis domain line ────────────────────── */}
                            <line x1={0} y1={0} x2={0} y2={innerH} stroke={AXIS_COLOR} strokeWidth={1.5} />

                            {/* ── Y-axis tick marks + labels ────────────── */}
                            {yTicks.map(t => {
                                const py = yScale(t)
                                return (
                                    <g key={`ytick-${t}`}>
                                        <line x1={-6} y1={py} x2={0} y2={py} stroke={AXIS_COLOR} strokeWidth={1.5} />
                                        <text
                                            x={-10} y={py}
                                            textAnchor="end" dominantBaseline="middle"
                                            fontSize={11} fontWeight={600} fill={LABEL_COLOR}
                                        >
                                            {`${Math.round(t * 100)}%`}
                                        </text>
                                    </g>
                                )
                            })}

                            {/* ── Y-axis legend label ───────────────────── */}
                            <text
                                transform={`translate(${-(MARGIN.left - 16)},${innerH / 2}) rotate(-90)`}
                                textAnchor="middle"
                                fontSize={12} fontWeight={700} fill={LABEL_COLOR}
                            >
                                {raceName} VAP %
                            </text>

                            {/* ── X-axis domain line ────────────────────── */}
                            <line x1={0} y1={innerH} x2={innerW} y2={innerH} stroke={AXIS_COLOR} strokeWidth={1.5} />

                            {/* ── X-axis tick marks + district index labels  */}
                            {districts.map(d => {
                                const cx = xScale(d.index) + xScale.bandwidth() / 2
                                return (
                                    <g key={`xtick-${d.index}`}>
                                        <line x1={cx} y1={innerH} x2={cx} y2={innerH + 6} stroke={AXIS_COLOR} strokeWidth={1.5} />
                                        <text
                                            x={cx} y={innerH + 17}
                                            textAnchor="middle"
                                            fontSize={11} fontWeight={600} fill={LABEL_COLOR}
                                        >
                                            {d.index}
                                        </text>
                                    </g>
                                )
                            })}

                            {/* ── X-axis legend label ───────────────────── */}
                            <text
                                x={innerW / 2} y={innerH + MARGIN.bottom - 10}
                                textAnchor="middle"
                                fontSize={12} fontWeight={700} fill={LABEL_COLOR}
                            >
                                Indexed Districts (sorted by {raceName} %)
                            </text>


                            {/* ── Box plots — one per district ─────────── */}
                            {districts.map(d => {
                                const cx  = xScale(d.index) + xScale.bandwidth() / 2
                                const bw  = xScale.bandwidth() * 0.80   // box uses 80% of band
                                const capW = xScale.bandwidth() * 0.45  // whisker cap = 45% of band

                                const yQ1  = yScale(d.q1)
                                const yQ3  = yScale(d.q3)
                                const yMed = yScale(d.median)
                                const yAvg = yScale(d.mean)
                                const yMin = yScale(d.min)
                                const yMax = yScale(d.max)

                                const enacted  = enactedDistricts?.find(e => e.index === d.index)
                                const yEnacted = enacted ? yScale(enacted.groupVapPercentage) : null

                                /* Offset dots horizontally when they'd overlap (<10 px apart) */
                                const overlapping = enacted && Math.abs(yAvg - yEnacted) < 10
                                const meanDotCx    = overlapping ? cx - 5 : cx
                                const enactedDotCx = overlapping ? cx + 5 : cx

                                return (
                                    <g key={`box-${d.index}`}>

                                        {/* Upper whisker: q3 → max (dashed) */}
                                        <line
                                            x1={cx} y1={yQ3} x2={cx} y2={yMax}
                                            stroke={BOX_STROKE} strokeWidth={1.5} strokeDasharray="3 2"
                                        />

                                        {/* Lower whisker: q1 → min (dashed) */}
                                        <line
                                            x1={cx} y1={yQ1} x2={cx} y2={yMin}
                                            stroke={BOX_STROKE} strokeWidth={1.5} strokeDasharray="3 2"
                                        />

                                        {/* Max whisker cap */}
                                        <line
                                            x1={cx - capW / 2} y1={yMax} x2={cx + capW / 2} y2={yMax}
                                            stroke={BOX_STROKE} strokeWidth={2}
                                        />

                                        {/* Min whisker cap */}
                                        <line
                                            x1={cx - capW / 2} y1={yMin} x2={cx + capW / 2} y2={yMin}
                                            stroke={BOX_STROKE} strokeWidth={2}
                                        />

                                        {/* IQR box (q1 → q3) */}
                                        <rect
                                            x={cx - bw / 2} y={yQ3}
                                            width={bw} height={Math.max(0, yQ1 - yQ3)}
                                            fill={BOX_FILL} stroke={BOX_STROKE} strokeWidth={1.5} rx={2}
                                        />

                                        {/* Median line (drawn on top of box) */}
                                        <line
                                            x1={cx - bw / 2} y1={yMed} x2={cx + bw / 2} y2={yMed}
                                            stroke={MEDIAN_CLR} strokeWidth={2.5}
                                        />

                                        {/* Mean dot (amber) — "Average for the district" */}
                                        <circle cx={meanDotCx} cy={yAvg} r={4} fill={MEAN_CLR} stroke="white" strokeWidth={1.2} />

                                        {/* Enacted plan dot (brand purple) */}
                                        {enacted && (
                                            <circle cx={enactedDotCx} cy={yEnacted} r={4.5} fill={ENACTED_COLOR} stroke="white" strokeWidth={1.5} />
                                        )}

                                        {/* Invisible hover rect for the full column width */}
                                        <rect
                                            x={xScale(d.index)} y={0}
                                            width={xScale.bandwidth()} height={innerH}
                                            fill="transparent"
                                            style={{ cursor: 'crosshair' }}
                                            onMouseMove={e => handleMouseMove(e, d)}
                                            onMouseLeave={() => setHovered({ district: null, x: 0, y: 0 })}
                                        />
                                    </g>
                                )
                            })}

                        </g>
                    </svg>
                )}
            </div>
        </div>
    )
}
