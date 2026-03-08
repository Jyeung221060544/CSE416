/**
 * BoxWhiskerCompareChart.jsx — Overlay box & whisker comparison of
 * Race-Blind vs VRA-Constrained ensembles for a single race group.
 *
 * Both ensembles share the same rank-slot x position, drawn slightly offset:
 *   RB  — centered at (bandCenter − OFFSET), teal stroke
 *   VRA — centered at (bandCenter + OFFSET), orange stroke
 *
 * This overlay makes the distributional shift between ensembles immediately
 * visible at each rank position. Hover left-half → RB tooltip, right → VRA.
 *
 * Pure renderer — all district arrays are passed from EnsembleAnalysisSection.
 *
 * PROPS
 *   rbDistricts      {Array}       — bwRaceBlind.groupDistricts[race]
 *   vraDistricts     {Array}       — bwVraConstr.groupDistricts[race]
 *   enactedDistricts {Array|null}  — bwData.enactedPlan.groupDistricts[race]
 *   raceName         {string}      — Display label for y-axis + legend
 *   sharedYMax       {number}      — Shared y ceiling from parent
 *   className        {string}      — Optional height override
 */

import { useRef, useEffect, useState, useMemo } from 'react'
import * as d3 from 'd3'
import { AXIS_COLOR, LABEL_COLOR, COMPARE_RB_COLOR, COMPARE_VRA_COLOR } from '@/lib/partyColors'


/* ── Color palette ───────────────────────────────────────────────────────── */
const RB_STROKE  = COMPARE_RB_COLOR   // teal   — Race-Blind border + whiskers
const RB_FILL    = '#d1fae5'           // emerald-100 — Race-Blind IQR fill
const RB_MEDIAN  = '#065f46'           // emerald-900 — Race-Blind median line

const VRA_STROKE = COMPARE_VRA_COLOR  // orange — VRA border + whiskers
const VRA_FILL   = '#fef3c7'           // amber-100  — VRA IQR fill
const VRA_MEDIAN = '#92400e'           // amber-800  — VRA median line

const MEAN_CLR    = '#f59e0b'   // amber-500 — mean dot (both ensembles)
const ENACTED_CLR = '#ec4899'   // pink-500  — enacted plan dot
const GRID_CLR    = '#dce8f0'

const MARGIN    = { top: 30, right: 22, bottom: 62, left: 74 }
const INNER_GAP = 5   // px gap between the two boxes within a band


/* ── Container size hook ─────────────────────────────────────────────────── */
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


/* ── Background gradient ─────────────────────────────────────────────────── */
function BgRect({ innerWidth, innerHeight }) {
    return (
        <g>
            <defs>
                <linearGradient id="bwCompareBg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#eef6ff" />
                    <stop offset="100%" stopColor="#f8fafc" />
                </linearGradient>
            </defs>
            <rect width={innerWidth} height={innerHeight} fill="url(#bwCompareBg)" rx={6} />
            <rect width={innerWidth} height={innerHeight} fill="none" stroke="#b6cfdf" strokeWidth={1.5} rx={6} />
        </g>
    )
}


/* ── Tooltip ─────────────────────────────────────────────────────────────── */
function CompareTooltip({ districtIdx, ensemble, rbDistricts, vraDistricts, enactedDistricts, x, y }) {
    if (!districtIdx) return null
    const arr = ensemble === 'rb' ? rbDistricts : vraDistricts
    const d   = arr?.find(r => r.index === districtIdx)
    if (!d) return null

    const stroke  = ensemble === 'rb' ? RB_STROKE : VRA_STROKE
    const medClr  = ensemble === 'rb' ? RB_MEDIAN : VRA_MEDIAN
    const label   = ensemble === 'rb' ? 'Race-Blind' : 'VRA-Constrained'
    const fmt     = v => `${(v * 100).toFixed(1)}%`
    const enacted = enactedDistricts?.find(e => e.index === districtIdx)

    return (
        <div style={{
            position: 'absolute', left: x + 14, top: Math.max(4, y - 220),
            background: 'white', border: `2px solid ${stroke}`, borderRadius: 8,
            padding: '8px 12px', boxShadow: '0 4px 16px rgba(0,0,0,0.13)',
            fontSize: 12, lineHeight: 1.75, pointerEvents: 'none', zIndex: 50, minWidth: 175,
        }}>
            <div style={{ color: stroke, fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 2 }}>
                District {districtIdx}
            </div>
            <div style={{ color: stroke, fontWeight: 600, fontSize: 11, marginBottom: 4 }}>{label}</div>
            <div style={{ color: '#475569' }}>Max:    <strong style={{ color: LABEL_COLOR }}>{fmt(d.max)}</strong></div>
            <div style={{ color: '#475569' }}>Q3:     <strong style={{ color: LABEL_COLOR }}>{fmt(d.q3)}</strong></div>
            <div style={{ color: '#475569' }}>Median: <strong style={{ color: medClr      }}>{fmt(d.median)}</strong></div>
            <div style={{ color: '#475569' }}>Mean:   <strong style={{ color: MEAN_CLR    }}>{fmt(d.mean)}</strong></div>
            <div style={{ color: '#475569' }}>Q1:     <strong style={{ color: LABEL_COLOR }}>{fmt(d.q1)}</strong></div>
            <div style={{ color: '#475569' }}>Min:    <strong style={{ color: LABEL_COLOR }}>{fmt(d.min)}</strong></div>
            {enacted && (
                <div style={{ color: '#475569', marginTop: 2, borderTop: '1px solid #e2e8f0', paddingTop: 2 }}>
                    Enacted: <strong style={{ color: ENACTED_CLR }}>{fmt(enacted.groupVapPercentage)}</strong>
                    <span style={{ color: '#94a3b8', fontSize: 10 }}> ({enacted.districtId})</span>
                </div>
            )}
        </div>
    )
}


/* ── Single box-and-whisker ──────────────────────────────────────────────── */
/*
 * Renders one box plot (whiskers, IQR rect, median line, mean dot).
 * cx     — center x of this box within the SVG
 * boxW   — full pixel width of the IQR box
 * d      — district data row { index, min, q1, median, mean, q3, max }
 * stroke / fill / medClr — colors for this ensemble
 */
function SingleBox({ cx, boxW, d, yScale, stroke, fill, medClr }) {
    const capW = boxW * 0.65

    const yQ1  = yScale(d.q1)
    const yQ3  = yScale(d.q3)
    const yMed = yScale(d.median)
    const yAvg = yScale(d.mean)
    const yMin = yScale(d.min)
    const yMax = yScale(d.max)

    return (
        <g>
            {/* Upper whisker */}
            <line x1={cx} y1={yQ3} x2={cx} y2={yMax}
                stroke={stroke} strokeWidth={1.5} strokeDasharray="3 2" />
            {/* Lower whisker */}
            <line x1={cx} y1={yQ1} x2={cx} y2={yMin}
                stroke={stroke} strokeWidth={1.5} strokeDasharray="3 2" />
            {/* Max cap */}
            <line x1={cx - capW / 2} y1={yMax} x2={cx + capW / 2} y2={yMax}
                stroke={stroke} strokeWidth={2} />
            {/* Min cap */}
            <line x1={cx - capW / 2} y1={yMin} x2={cx + capW / 2} y2={yMin}
                stroke={stroke} strokeWidth={2} />
            {/* IQR box */}
            <rect
                x={cx - boxW / 2} y={yQ3}
                width={boxW} height={Math.max(0, yQ1 - yQ3)}
                fill={fill} stroke={stroke} strokeWidth={2} rx={2}
            />
            {/* Median line */}
            <line x1={cx - boxW / 2} y1={yMed} x2={cx + boxW / 2} y2={yMed}
                stroke={medClr} strokeWidth={2.5} />
            {/* Mean dot */}
            <circle cx={cx} cy={yAvg} r={4} fill={MEAN_CLR} stroke="white" strokeWidth={1.2} />
        </g>
    )
}


/* ── Main component ──────────────────────────────────────────────────────── */
export default function BoxWhiskerCompareChart({
    rbDistricts,
    vraDistricts,
    enactedDistricts,
    raceName  = 'Group',
    sharedYMax,
    className,
}) {
    const containerRef = useRef(null)
    const { width, height } = useContainerSize(containerRef)
    const [hovered, setHovered] = useState({ districtIdx: null, ensemble: null, x: 0, y: 0 })

    const innerW = Math.max(0, width  - MARGIN.left - MARGIN.right)
    const innerH = Math.max(0, height - MARGIN.top  - MARGIN.bottom)

    /* Union of all district indices present in either ensemble */
    const allIndices = useMemo(() => {
        const set = new Set([
            ...(rbDistricts  ?? []).map(d => d.index),
            ...(vraDistricts ?? []).map(d => d.index),
        ])
        return [...set].sort((a, b) => a - b)
    }, [rbDistricts, vraDistricts])

    /* Band scale: one band per rank slot (slightly less padding for two boxes) */
    const xScale = useMemo(() => {
        if (!innerW || !allIndices.length) return null
        return d3.scaleBand()
            .domain(allIndices)
            .range([0, innerW])
            .padding(0.30)
    }, [innerW, allIndices])

    const yScale = useMemo(() => {
        if (!innerH) return null
        return d3.scaleLinear()
            .domain([0, sharedYMax ?? 1.0])
            .range([innerH, 0])
    }, [innerH, sharedYMax])

    const yTicks = useMemo(() => (yScale ? yScale.ticks(8) : []), [yScale])

    if (!allIndices.length) {
        return (
            <div className={`w-full rounded-xl border border-dashed border-brand-muted/30 bg-brand-surface/20 flex items-center justify-center ${className ?? 'h-[360px]'}`}>
                <p className="text-brand-muted/50 text-sm italic">No data available</p>
            </div>
        )
    }

    function handleMouseMove(e, districtIdx, ensemble) {
        if (!containerRef.current) return
        const rect = containerRef.current.getBoundingClientRect()
        setHovered({ districtIdx, ensemble, x: e.clientX - rect.left, y: e.clientY - rect.top })
    }

    return (
        <div className={`w-full rounded-xl border border-brand-muted/25 shadow-sm bg-white flex flex-col relative ${className ?? 'h-[360px]'}`}>

            {/* ── LEGEND — inline row above chart ────────────────────────── */}
            <div className="flex items-center gap-4 px-4 pt-2.5 pb-1 shrink-0 flex-wrap">
                <div className="flex items-center gap-1.5">
                    <svg width="22" height="13">
                        <rect x="1" y="1" width="20" height="11" fill={RB_FILL} stroke={RB_STROKE} strokeWidth={2} rx={2} />
                        <line x1="1" y1="6.5" x2="21" y2="6.5" stroke={RB_MEDIAN} strokeWidth={2.5} />
                    </svg>
                    <span style={{ fontSize: 11, color: LABEL_COLOR, fontWeight: 600 }}>Race-Blind</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <svg width="22" height="13">
                        <rect x="1" y="1" width="20" height="11" fill={VRA_FILL} stroke={VRA_STROKE} strokeWidth={2} rx={2} />
                        <line x1="1" y1="6.5" x2="21" y2="6.5" stroke={VRA_MEDIAN} strokeWidth={2.5} />
                    </svg>
                    <span style={{ fontSize: 11, color: LABEL_COLOR, fontWeight: 600 }}>VRA-Constrained</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <svg width="12" height="12"><circle cx="6" cy="6" r="5" fill={MEAN_CLR} stroke="white" strokeWidth={1} /></svg>
                    <span style={{ fontSize: 11, color: LABEL_COLOR }}>Mean</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <svg width="12" height="12"><circle cx="6" cy="6" r="5" fill={ENACTED_CLR} stroke="white" strokeWidth={1} /></svg>
                    <span style={{ fontSize: 11, color: ENACTED_CLR }}>Enacted</span>
                </div>
            </div>

            {/* ── SVG CHART ─────────────────────────────────────────────── */}
            <div
                ref={containerRef}
                className="flex-1 min-h-0 relative"
                onMouseLeave={() => setHovered({ districtIdx: null, ensemble: null, x: 0, y: 0 })}
            >
                <CompareTooltip
                    districtIdx={hovered.districtIdx}
                    ensemble={hovered.ensemble}
                    rbDistricts={rbDistricts}
                    vraDistricts={vraDistricts}
                    enactedDistricts={enactedDistricts}
                    x={hovered.x}
                    y={hovered.y}
                />

                {width > 0 && height > 0 && xScale && yScale && (
                    <svg width={width} height={height} style={{ display: 'block' }}>
                        <g transform={`translate(${MARGIN.left},${MARGIN.top})`}>

                            <BgRect innerWidth={innerW} innerHeight={innerH} />

                            {/* Grid lines */}
                            {yTicks.map(t => (
                                <line key={`grid-${t}`}
                                    x1={0} y1={yScale(t)} x2={innerW} y2={yScale(t)}
                                    stroke={GRID_CLR} strokeWidth={1} strokeDasharray="3 4" />
                            ))}

                            {/* Y-axis */}
                            <line x1={0} y1={0} x2={0} y2={innerH} stroke={AXIS_COLOR} strokeWidth={1.5} />
                            {yTicks.map(t => (
                                <g key={`ytick-${t}`}>
                                    <line x1={-6} y1={yScale(t)} x2={0} y2={yScale(t)} stroke={AXIS_COLOR} strokeWidth={1.5} />
                                    <text x={-10} y={yScale(t)} textAnchor="end" dominantBaseline="middle"
                                        fontSize={11} fontWeight={600} fill={LABEL_COLOR}>
                                        {`${Math.round(t * 100)}%`}
                                    </text>
                                </g>
                            ))}
                            <text
                                transform={`translate(${-(MARGIN.left - 16)},${innerH / 2}) rotate(-90)`}
                                textAnchor="middle" fontSize={12} fontWeight={700} fill={LABEL_COLOR}>
                                {raceName} VAP %
                            </text>

                            {/* X-axis */}
                            <line x1={0} y1={innerH} x2={innerW} y2={innerH} stroke={AXIS_COLOR} strokeWidth={1.5} />
                            {allIndices.map(idx => {
                                const cx = xScale(idx) + xScale.bandwidth() / 2
                                return (
                                    <g key={`xtick-${idx}`}>
                                        <line x1={cx} y1={innerH} x2={cx} y2={innerH + 6} stroke={AXIS_COLOR} strokeWidth={1.5} />
                                        <text x={cx} y={innerH + 17} textAnchor="middle"
                                            fontSize={11} fontWeight={600} fill={LABEL_COLOR}>
                                            {idx}
                                        </text>
                                    </g>
                                )
                            })}
                            <text x={innerW / 2} y={innerH + MARGIN.bottom - 10}
                                textAnchor="middle" fontSize={12} fontWeight={700} fill={LABEL_COLOR}>
                                Rank Position (by {raceName} VAP %)
                            </text>

                            {/* ── Box plots — side-by-side per rank slot ───── */}
                            {allIndices.map(idx => {
                                const bandStart = xScale(idx)
                                const bandW     = xScale.bandwidth()
                                const halfBand  = (bandW - INNER_GAP) / 2
                                const rbCx      = bandStart + halfBand / 2
                                const vraCx     = bandStart + halfBand + INNER_GAP + halfBand / 2
                                const boxW      = halfBand * 0.80

                                const rbD    = (rbDistricts  ?? []).find(d => d.index === idx)
                                const vraD   = (vraDistricts ?? []).find(d => d.index === idx)
                                const enacted  = enactedDistricts?.find(e => e.index === idx)
                                const yEnacted = enacted ? yScale(enacted.groupVapPercentage) : null

                                return (
                                    <g key={`group-${idx}`}>

                                        {/* Race-Blind box — left half */}
                                        {rbD && (
                                            <SingleBox
                                                cx={rbCx} boxW={boxW} d={rbD}
                                                yScale={yScale}
                                                stroke={RB_STROKE} fill={RB_FILL} medClr={RB_MEDIAN}
                                            />
                                        )}

                                        {/* VRA box — right half */}
                                        {vraD && (
                                            <SingleBox
                                                cx={vraCx} boxW={boxW} d={vraD}
                                                yScale={yScale}
                                                stroke={VRA_STROKE} fill={VRA_FILL} medClr={VRA_MEDIAN}
                                            />
                                        )}

                                        {/* Enacted dot — between the two boxes */}
                                        {enacted && yEnacted !== null && (
                                            <circle
                                                cx={bandStart + bandW / 2}
                                                cy={yEnacted}
                                                r={5} fill={ENACTED_CLR} stroke="white" strokeWidth={1.5}
                                            />
                                        )}

                                        {/* Hover rect — left half → RB tooltip */}
                                        <rect
                                            x={bandStart} y={0}
                                            width={halfBand} height={innerH}
                                            fill="transparent"
                                            style={{ cursor: 'crosshair' }}
                                            onMouseMove={e => handleMouseMove(e, idx, 'rb')}
                                        />
                                        {/* Hover rect — right half → VRA tooltip */}
                                        <rect
                                            x={bandStart + halfBand + INNER_GAP} y={0}
                                            width={halfBand} height={innerH}
                                            fill="transparent"
                                            style={{ cursor: 'crosshair' }}
                                            onMouseMove={e => handleMouseMove(e, idx, 'vra')}
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
