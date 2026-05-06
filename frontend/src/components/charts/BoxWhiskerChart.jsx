import { useRef, useEffect, useState, useMemo } from 'react'
import * as d3 from 'd3'
import { AXIS_COLOR, LABEL_COLOR } from '@/lib/partyColors'

const BOX_FILL     = '#dbeafe'
const BOX_STROKE   = '#2563eb'
const MEDIAN_CLR   = '#1e40af'
const MEAN_CLR     = '#f59e0b'
const ENACTED_COLOR = '#ec4899'
const GRID_CLR    = '#dce8f0'

const MARGIN = { top: 30, right: 22, bottom: 62, left: 74 }

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

/**
 * Soft gradient background rect. Uses a unique gradient ID per instance to prevent
 * cross-chart bleed when two BoxWhiskerChart instances share the same DOM.
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

export default function BoxWhiskerChart({
    districts,
    enactedDistricts,
    raceName    = 'Group',
    chartId     = 'bw',
    sharedYMax,
    className,
}) {

    const containerRef = useRef(null)
    const { width, height } = useContainerSize(containerRef)
    const [hovered, setHovered] = useState({ district: null, x: 0, y: 0 })

    const innerW = Math.max(0, width  - MARGIN.left - MARGIN.right)
    const innerH = Math.max(0, height - MARGIN.top  - MARGIN.bottom)

    const xScale = useMemo(() => {
        if (!innerW || !districts?.length) return null
        return d3.scaleBand()
            .domain(districts.map(d => d.index))
            .range([0, innerW])
            .padding(0.35)
    }, [innerW, districts])

    const yScale = useMemo(() => {
        if (!innerH) return null
        const yMax = sharedYMax ?? 1.0
        return d3.scaleLinear()
            .domain([0, yMax])
            .range([innerH, 0])
    }, [innerH, sharedYMax])

    const yTicks = useMemo(() => (yScale ? yScale.ticks(8) : []), [yScale])

    if (!districts?.length) {
        return (
            <div className={`w-full rounded-xl border border-dashed border-brand-muted/30 bg-brand-surface/20 flex items-center justify-center ${className ?? 'h-[360px]'}`}>
                <p className="text-brand-muted/50 text-sm italic">No data available</p>
            </div>
        )
    }

    function handleMouseMove(e, d) {
        if (!containerRef.current) return
        const rect = containerRef.current.getBoundingClientRect()
        setHovered({ district: d, x: e.clientX - rect.left, y: e.clientY - rect.top })
    }

    return (
        <div className={`w-full rounded-xl border border-brand-muted/25 shadow-sm bg-white flex flex-col ${className ?? 'h-[360px]'}`}>

            <div className="flex flex-wrap items-center gap-4 px-4 pt-3 pb-1 flex-shrink-0">
                <div className="flex items-center gap-1.5">
                    <svg width="22" height="14">
                        <rect x="1" y="1" width="20" height="12" fill={BOX_FILL} stroke={BOX_STROKE} strokeWidth={1.5} rx={2} />
                        <line x1="1" y1="7" x2="21" y2="7" stroke={MEDIAN_CLR} strokeWidth={2.5} />
                    </svg>
                    <span style={{ fontSize: 12, fontWeight: 600, color: LABEL_COLOR }}>IQR (Q1–Q3)</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <svg width="12" height="12">
                        <circle cx="6" cy="6" r="5" fill={MEAN_CLR} stroke="white" strokeWidth={1} />
                    </svg>
                    <span style={{ fontSize: 12, fontWeight: 600, color: LABEL_COLOR }}>Mean</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <svg width="12" height="12">
                        <circle cx="6" cy="6" r="5" fill={ENACTED_COLOR} stroke="white" strokeWidth={1} />
                    </svg>
                    <span style={{ fontSize: 12, fontWeight: 600, color: ENACTED_COLOR }}>Enacted</span>
                </div>
                <span className="ml-auto text-[11px] font-semibold text-slate-500 opacity-70 select-none">
                    {raceName} VAP %
                </span>
            </div>

            <div
                ref={containerRef}
                className="flex-1 min-h-0 relative"
                onMouseLeave={() => setHovered({ district: null, x: 0, y: 0 })}
            >
                <Tooltip
                    district={hovered.district}
                    enactedDistricts={enactedDistricts}
                    x={hovered.x}
                    y={hovered.y}
                />

                {width > 0 && height > 0 && xScale && yScale && (
                    <svg width={width} height={height} style={{ display: 'block' }}>
                        <g transform={`translate(${MARGIN.left},${MARGIN.top})`}>

                            <BgRect innerWidth={innerW} innerHeight={innerH} chartId={chartId} />

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

                            <line x1={0} y1={0} x2={0} y2={innerH} stroke={AXIS_COLOR} strokeWidth={1.5} />

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

                            <text
                                transform={`translate(${-(MARGIN.left - 16)},${innerH / 2}) rotate(-90)`}
                                textAnchor="middle"
                                fontSize={12} fontWeight={700} fill={LABEL_COLOR}
                            >
                                {raceName} VAP %
                            </text>

                            <line x1={0} y1={innerH} x2={innerW} y2={innerH} stroke={AXIS_COLOR} strokeWidth={1.5} />

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

                            <text
                                x={innerW / 2} y={innerH + MARGIN.bottom - 10}
                                textAnchor="middle"
                                fontSize={12} fontWeight={700} fill={LABEL_COLOR}
                            >
                                Indexed Districts (sorted by {raceName} %)
                            </text>

                            {districts.map(d => {
                                const cx  = xScale(d.index) + xScale.bandwidth() / 2
                                const bw  = xScale.bandwidth() * 0.80
                                const capW = xScale.bandwidth() * 0.45

                                const yQ1  = yScale(d.q1)
                                const yQ3  = yScale(d.q3)
                                const yMed = yScale(d.median)
                                const yAvg = yScale(d.mean)
                                const yMin = yScale(d.min)
                                const yMax = yScale(d.max)

                                const enacted  = enactedDistricts?.find(e => e.index === d.index)
                                const yEnacted = enacted ? yScale(enacted.groupVapPercentage) : null

                                /* Offset mean and enacted dots horizontally when they'd overlap (<10 px apart) */
                                const overlapping = enacted && Math.abs(yAvg - yEnacted) < 10
                                const meanDotCx    = overlapping ? cx - 5 : cx
                                const enactedDotCx = overlapping ? cx + 5 : cx

                                return (
                                    <g key={`box-${d.index}`}>
                                        <line x1={cx} y1={yQ3} x2={cx} y2={yMax}
                                            stroke={BOX_STROKE} strokeWidth={1.5} strokeDasharray="3 2" />
                                        <line x1={cx} y1={yQ1} x2={cx} y2={yMin}
                                            stroke={BOX_STROKE} strokeWidth={1.5} strokeDasharray="3 2" />
                                        <line x1={cx - capW / 2} y1={yMax} x2={cx + capW / 2} y2={yMax}
                                            stroke={BOX_STROKE} strokeWidth={2} />
                                        <line x1={cx - capW / 2} y1={yMin} x2={cx + capW / 2} y2={yMin}
                                            stroke={BOX_STROKE} strokeWidth={2} />
                                        <rect
                                            x={cx - bw / 2} y={yQ3}
                                            width={bw} height={Math.max(0, yQ1 - yQ3)}
                                            fill={BOX_FILL} stroke={BOX_STROKE} strokeWidth={1.5} rx={2}
                                        />
                                        <line x1={cx - bw / 2} y1={yMed} x2={cx + bw / 2} y2={yMed}
                                            stroke={MEDIAN_CLR} strokeWidth={2.5} />
                                        <circle cx={meanDotCx} cy={yAvg} r={4} fill={MEAN_CLR} stroke="white" strokeWidth={1.2} />
                                        {enacted && (
                                            <circle cx={enactedDotCx} cy={yEnacted} r={4.5} fill={ENACTED_COLOR} stroke="white" strokeWidth={1.5} />
                                        )}
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
