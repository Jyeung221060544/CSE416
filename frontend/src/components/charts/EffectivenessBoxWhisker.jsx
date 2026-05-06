import { useRef, useEffect, useState, useMemo } from 'react'
import * as d3 from 'd3'
import { COMPARE_RB_COLOR, COMPARE_VRA_COLOR, AXIS_COLOR, LABEL_COLOR, RACE_LABELS } from '@/lib/partyColors'

const RB_FILL      = COMPARE_RB_COLOR
const RB_STROKE    = '#1aaa7a'
const RB_MEDIAN    = '#0d6e4e'
const VRA_FILL     = COMPARE_VRA_COLOR
const VRA_STROKE   = '#b86a10'
const VRA_MEDIAN   = '#7a4206'
const ENACTED_CLR  = '#e11d48'
const GRID_CLR     = '#dce8f0'

const MARGIN = { top: 28, right: 20, bottom: 58, left: 62 }

/** Tracks the pixel dimensions of a DOM element via ResizeObserver. */
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

function BgRect({ innerWidth, innerHeight }) {
    return (
        <g>
            <defs>
                <linearGradient id="effBwBg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor="#eef6ff" />
                    <stop offset="100%" stopColor="#f8fafc" />
                </linearGradient>
            </defs>
            <rect width={innerWidth} height={innerHeight} fill="url(#effBwBg)" rx={6} />
            <rect width={innerWidth} height={innerHeight} fill="none" stroke="#b6cfdf" strokeWidth={1.5} rx={6} />
        </g>
    )
}

/** Tooltip showing box stats and enacted count for a hovered Race-Blind or VRA-Constrained box. */
function Tooltip({ hovered, x, y }) {
    if (!hovered) return null
    const { raceName, type, stats, enacted } = hovered
    const fill   = type === 'race-blind' ? RB_FILL : VRA_FILL
    const label  = type === 'race-blind' ? 'Race-Blind' : 'VRA-Constrained'
    return (
        <div style={{
            position: 'absolute', left: x + 14, top: Math.max(4, y - 180),
            background: 'white', border: `2px solid ${fill}`, borderRadius: 8,
            padding: '8px 12px', boxShadow: '0 4px 16px rgba(0,0,0,0.13)',
            fontSize: 12, lineHeight: 1.75, pointerEvents: 'none', zIndex: 50, minWidth: 168,
        }}>
            <div style={{ color: fill, fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>
                {raceName} — {label}
            </div>
            <div style={{ color: '#475569' }}>Max:    <strong style={{ color: LABEL_COLOR }}>{stats.max}</strong></div>
            <div style={{ color: '#475569' }}>Q3:     <strong style={{ color: LABEL_COLOR }}>{stats.q3}</strong></div>
            <div style={{ color: '#475569' }}>Median: <strong style={{ color: LABEL_COLOR }}>{stats.median}</strong></div>
            <div style={{ color: '#475569' }}>Mean:   <strong style={{ color: LABEL_COLOR }}>{stats.mean.toFixed(1)}</strong></div>
            <div style={{ color: '#475569' }}>Q1:     <strong style={{ color: LABEL_COLOR }}>{stats.q1}</strong></div>
            <div style={{ color: '#475569' }}>Min:    <strong style={{ color: LABEL_COLOR }}>{stats.min}</strong></div>
            {enacted != null && (
                <div style={{ color: '#475569', marginTop: 2, borderTop: '1px solid #e2e8f0', paddingTop: 2 }}>
                    Enacted: <strong style={{ color: ENACTED_CLR }}>{enacted}</strong>
                </div>
            )}
        </div>
    )
}

/** Renders one box-and-whisker glyph (whiskers, IQR rect, median line) with a transparent hover target. */
function BoxGroup({ cx, bw, stats, yScale, fill, stroke, medianClr, onMouseMove, onMouseLeave }) {
    const capW  = bw * 0.55
    const yQ1   = yScale(stats.q1)
    const yQ3   = yScale(stats.q3)
    const yMed  = yScale(stats.median)
    const yMin  = yScale(stats.min)
    const yMax  = yScale(stats.max)

    return (
        <g>
            <line x1={cx} y1={yQ3} x2={cx} y2={yMax}
                stroke={stroke} strokeWidth={1.5} strokeDasharray="3 2" />
            <line x1={cx} y1={yQ1} x2={cx} y2={yMin}
                stroke={stroke} strokeWidth={1.5} strokeDasharray="3 2" />
            <line x1={cx - capW / 2} y1={yMax} x2={cx + capW / 2} y2={yMax}
                stroke={stroke} strokeWidth={2} />
            <line x1={cx - capW / 2} y1={yMin} x2={cx + capW / 2} y2={yMin}
                stroke={stroke} strokeWidth={2} />
            <rect
                x={cx - bw / 2} y={yQ3}
                width={bw} height={Math.max(0, yQ1 - yQ3)}
                fill={fill} fillOpacity={0.65}
                stroke={stroke} strokeWidth={1.5} rx={2}
            />
            <line x1={cx - bw / 2} y1={yMed} x2={cx + bw / 2} y2={yMed}
                stroke={medianClr} strokeWidth={2.5} />
            <rect
                x={cx - bw / 2 - 4} y={0} width={bw + 8} height={1000}
                fill="transparent" style={{ cursor: 'crosshair' }}
                onMouseMove={onMouseMove}
                onMouseLeave={onMouseLeave}
            />
        </g>
    )
}

/**
 * Box-and-whisker chart for the Effectiveness Analysis — shows count of "effective"
 * districts per racial group, comparing Race-Blind vs VRA-Constrained ensembles.
 * Y-axis is integer district counts (not percentages), one slot per feasible group.
 * @param {object} data           - API response: { ensembles: [...], enactedPlan: {...} }.
 * @param {Array}  feasibleGroups - Race keys to display (e.g. ["black", "hispanic"]).
 */
export default function EffectivenessBoxWhisker({ data, feasibleGroups, className }) {

    /* ── Step 0: Container size + hover state ────────────────────────────── */
    const containerRef = useRef(null)
    const { width, height } = useContainerSize(containerRef)
    const [hovered, setHovered] = useState({ info: null, x: 0, y: 0 })

    /* ── Step 1: Resolve ensembles + inner dimensions ────────────────────── */
    const rbEnsemble  = data?.ensembles?.find(e => e.ensembleType === 'race-blind')
    const vraEnsemble = data?.ensembles?.find(e => e.ensembleType === 'vra-constrained')

    const innerW = Math.max(0, width  - MARGIN.left - MARGIN.right)
    const innerH = Math.max(0, height - MARGIN.top  - MARGIN.bottom)

    /* ── Step 2: Build y-scale from max across both ensembles ────────────── */
    const yScale = useMemo(() => {
        if (!innerH || !data || !feasibleGroups?.length) return null
        const allMax = feasibleGroups.flatMap(r => [
            rbEnsemble?.groupStats?.[r]?.max  ?? 0,
            vraEnsemble?.groupStats?.[r]?.max ?? 0,
        ])
        const yMax = Math.max(...allMax, 1)
        return d3.scaleLinear()
            .domain([0, yMax + 0.5])
            .range([innerH, 0])
            .nice()
    }, [innerH, data, feasibleGroups, rbEnsemble, vraEnsemble])

    const yTicks = useMemo(() => (yScale ? yScale.ticks(6).filter(Number.isInteger) : []), [yScale])

    /* ── Step 3: Compute per-group slot positions ────────────────────────── */
    const groupLayout = useMemo(() => {
        if (!innerW || !feasibleGroups?.length) return []
        const n        = feasibleGroups.length
        const slotW    = innerW / n
        const boxW     = Math.min(slotW * 0.28, 40)
        const boxGap   = boxW * 0.55

        return feasibleGroups.map((race, i) => {
            const slotCx = slotW * i + slotW / 2
            return {
                race,
                slotCx,
                rbCx:  slotCx - boxGap / 2 - boxW / 2,
                vraCx: slotCx + boxGap / 2 + boxW / 2,
                boxW,
            }
        })
    }, [innerW, feasibleGroups])

    /* ── Step 4: Render ──────────────────────────────────────────────────── */
    if (!data || !feasibleGroups?.length) {
        return (
            <div className={`w-full rounded-xl border border-dashed border-brand-muted/30 bg-brand-surface/20 flex items-center justify-center ${className ?? 'h-full'}`}>
                <p className="text-brand-muted/50 text-sm italic">No effectiveness data available</p>
            </div>
        )
    }

    function handleMouseMove(e, info) {
        if (!containerRef.current) return
        const rect = containerRef.current.getBoundingClientRect()
        setHovered({ info, x: e.clientX - rect.left, y: e.clientY - rect.top })
    }

    return (
        <div className={`w-full rounded-xl border border-brand-muted/25 shadow-sm bg-white flex flex-col ${className ?? 'h-full'}`}>

            <div className="flex flex-wrap items-center gap-4 px-4 pt-3 pb-1 shrink-0">
                <div className="flex items-center gap-1.5">
                    <svg width="22" height="14">
                        <rect x="1" y="1" width="20" height="12" fill={RB_FILL} fillOpacity={0.65} stroke={RB_STROKE} strokeWidth={1.5} rx={2} />
                        <line x1="1" y1="7" x2="21" y2="7" stroke={RB_MEDIAN} strokeWidth={2.5} />
                    </svg>
                    <span style={{ fontSize: 12, fontWeight: 600, color: LABEL_COLOR }}>Race-Blind</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <svg width="22" height="14">
                        <rect x="1" y="1" width="20" height="12" fill={VRA_FILL} fillOpacity={0.65} stroke={VRA_STROKE} strokeWidth={1.5} rx={2} />
                        <line x1="1" y1="7" x2="21" y2="7" stroke={VRA_MEDIAN} strokeWidth={2.5} />
                    </svg>
                    <span style={{ fontSize: 12, fontWeight: 600, color: LABEL_COLOR }}>VRA-Constrained</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <svg width="12" height="12">
                        <circle cx="6" cy="6" r="5" fill={ENACTED_CLR} stroke="white" strokeWidth={1} />
                    </svg>
                    <span style={{ fontSize: 12, fontWeight: 600, color: ENACTED_CLR }}>Enacted Plan</span>
                </div>
            </div>

            <div
                ref={containerRef}
                className="flex-1 min-h-0 relative"
                onMouseLeave={() => setHovered({ info: null, x: 0, y: 0 })}
            >
                <Tooltip hovered={hovered.info} x={hovered.x} y={hovered.y} />

                {width > 0 && height > 0 && yScale && groupLayout.length > 0 && (
                    <svg width={width} height={height} style={{ display: 'block' }}>
                        <g transform={`translate(${MARGIN.left},${MARGIN.top})`}>

                            <BgRect innerWidth={innerW} innerHeight={innerH} />

                            {yTicks.map(t => (
                                <line key={`g-${t}`} x1={0} y1={yScale(t)} x2={innerW} y2={yScale(t)}
                                    stroke={GRID_CLR} strokeWidth={1} strokeDasharray="3 4" />
                            ))}

                            <line x1={0} y1={0} x2={0} y2={innerH} stroke={AXIS_COLOR} strokeWidth={1.5} />
                            {yTicks.map(t => (
                                <g key={`yt-${t}`}>
                                    <line x1={-6} y1={yScale(t)} x2={0} y2={yScale(t)} stroke={AXIS_COLOR} strokeWidth={1.5} />
                                    <text x={-10} y={yScale(t)} textAnchor="end" dominantBaseline="middle"
                                        fontSize={11} fontWeight={600} fill={LABEL_COLOR}>
                                        {t}
                                    </text>
                                </g>
                            ))}
                            <text
                                transform={`translate(${-(MARGIN.left - 14)},${innerH / 2}) rotate(-90)`}
                                textAnchor="middle" fontSize={11} fontWeight={700} fill={LABEL_COLOR}
                            >
                                Effective Districts
                            </text>

                            <line x1={0} y1={innerH} x2={innerW} y2={innerH} stroke={AXIS_COLOR} strokeWidth={1.5} />
                            {groupLayout.map(g => (
                                <g key={`xl-${g.race}`}>
                                    <line x1={g.slotCx} y1={innerH} x2={g.slotCx} y2={innerH + 5} stroke={AXIS_COLOR} strokeWidth={1.5} />
                                    <text x={g.slotCx} y={innerH + 18} textAnchor="middle"
                                        fontSize={12} fontWeight={700} fill={LABEL_COLOR}>
                                        {RACE_LABELS[g.race] ?? g.race}
                                    </text>
                                    <text x={g.slotCx} y={innerH + 32} textAnchor="middle"
                                        fontSize={10} fontWeight={500} fill={AXIS_COLOR}>
                                        Voters
                                    </text>
                                </g>
                            ))}
                            <text x={innerW / 2} y={innerH + MARGIN.bottom - 8}
                                textAnchor="middle" fontSize={11} fontWeight={700} fill={LABEL_COLOR}>
                                Racial / Ethnic Group
                            </text>

                            {groupLayout.slice(0, -1).map(g => (
                                <line key={`sep-${g.race}`}
                                    x1={g.slotCx + innerW / groupLayout.length / 2} y1={0}
                                    x2={g.slotCx + innerW / groupLayout.length / 2} y2={innerH}
                                    stroke={GRID_CLR} strokeWidth={1} strokeDasharray="4 4" />
                            ))}

                            {groupLayout.map(g => {
                                const rbStats  = rbEnsemble?.groupStats?.[g.race]
                                const vraStats = vraEnsemble?.groupStats?.[g.race]
                                const enacted  = data.enactedPlan?.[g.race] ?? null

                                return (
                                    <g key={`grp-${g.race}`}>
                                        {rbStats && (
                                            <BoxGroup
                                                cx={g.rbCx} bw={g.boxW}
                                                stats={rbStats} yScale={yScale}
                                                fill={RB_FILL} stroke={RB_STROKE} medianClr={RB_MEDIAN}
                                                onMouseMove={e => handleMouseMove(e, { raceName: RACE_LABELS[g.race] ?? g.race, type: 'race-blind', stats: rbStats, enacted })}
                                                onMouseLeave={() => setHovered({ info: null, x: 0, y: 0 })}
                                            />
                                        )}
                                        {vraStats && (
                                            <BoxGroup
                                                cx={g.vraCx} bw={g.boxW}
                                                stats={vraStats} yScale={yScale}
                                                fill={VRA_FILL} stroke={VRA_STROKE} medianClr={VRA_MEDIAN}
                                                onMouseMove={e => handleMouseMove(e, { raceName: RACE_LABELS[g.race] ?? g.race, type: 'vra-constrained', stats: vraStats, enacted })}
                                                onMouseLeave={() => setHovered({ info: null, x: 0, y: 0 })}
                                            />
                                        )}
                                        {enacted != null && yScale && (
                                            <circle
                                                cx={g.slotCx} cy={yScale(enacted)}
                                                r={5} fill={ENACTED_CLR} stroke="white" strokeWidth={1.5}
                                            />
                                        )}
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
