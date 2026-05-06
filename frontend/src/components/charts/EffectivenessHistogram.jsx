import { useRef, useEffect, useState, useMemo } from 'react'
import * as d3 from 'd3'
import { COMPARE_RB_COLOR, COMPARE_VRA_COLOR, AXIS_COLOR, LABEL_COLOR } from '@/lib/partyColors'

const RB_FILL    = COMPARE_RB_COLOR
const VRA_FILL   = COMPARE_VRA_COLOR
const GRID_CLR   = '#dce8f0'
const ENACTED_CLR = '#595a96'

const MARGIN = { top: 38, right: 20, bottom: 58, left: 72 }

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
                <linearGradient id="effHistBg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor="#eef6ff" />
                    <stop offset="100%" stopColor="#f8fafc" />
                </linearGradient>
            </defs>
            <rect width={innerWidth} height={innerHeight} fill="url(#effHistBg)" rx={6} />
            <rect width={innerWidth} height={innerHeight} fill="none" stroke="#b6cfdf" strokeWidth={1.5} rx={6} />
        </g>
    )
}

function Tooltip({ hovered, x, y, metricLabel }) {
    if (!hovered) return null
    return (
        <div style={{
            position: 'absolute', left: x + 14, top: Math.max(4, y - 120),
            background: 'white', border: `2px solid ${AXIS_COLOR}`, borderRadius: 8,
            padding: '8px 12px', boxShadow: '0 4px 16px rgba(0,0,0,0.13)',
            fontSize: 12, lineHeight: 1.75, pointerEvents: 'none', zIndex: 50, minWidth: 180,
        }}>
            <div style={{ color: LABEL_COLOR, fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>
                {hovered.numEffective} {metricLabel} District{hovered.numEffective !== 1 ? 's' : ''}
            </div>
            <div style={{ color: '#475569' }}>
                Race-Blind: <strong style={{ color: RB_FILL }}>{hovered.rb.toLocaleString()}</strong>
            </div>
            <div style={{ color: '#475569' }}>
                VRA-Constrained: <strong style={{ color: VRA_FILL }}>{hovered.vra.toLocaleString()}</strong>
            </div>
        </div>
    )
}

export default function EffectivenessHistogram({ data, raceKey, raceName = 'Group', metricLabel = 'Effective', className }) {

    const containerRef = useRef(null)
    const { width, height } = useContainerSize(containerRef)
    const [hovered, setHovered] = useState({ bin: null, x: 0, y: 0 })

    const innerW = Math.max(0, width  - MARGIN.left - MARGIN.right)
    const innerH = Math.max(0, height - MARGIN.top  - MARGIN.bottom)

    const { bins, enactedCount } = useMemo(() => {
        if (!data || !raceKey) return { bins: [], enactedCount: null }

        const rb  = data.ensembles?.find(e => e.ensembleType === 'race-blind')
        const vra = data.ensembles?.find(e => e.ensembleType === 'vra-constrained')
        const rbCounts  = rb?.groupCounts?.[raceKey]  ?? []
        const vraCounts = vra?.groupCounts?.[raceKey] ?? []

        /* Build a unified index covering all numEffective values in both series */
        const allNums = new Set([
            ...rbCounts.map(c => c.numEffective),
            ...vraCounts.map(c => c.numEffective),
        ])
        const rbMap  = Object.fromEntries(rbCounts.map(c  => [c.numEffective, c.frequency]))
        const vraMap = Object.fromEntries(vraCounts.map(c => [c.numEffective, c.frequency]))

        const merged = Array.from(allNums)
            .sort((a, b) => a - b)
            .map(n => ({ numEffective: n, rb: rbMap[n] ?? 0, vra: vraMap[n] ?? 0 }))

        return {
            bins: merged,
            enactedCount: data.enactedEffectiveByGroup?.[raceKey] ?? null,
        }
    }, [data, raceKey])

    const xScale = useMemo(() => {
        if (!innerW || !bins.length) return null
        return d3.scaleBand()
            .domain(bins.map(b => b.numEffective))
            .range([0, innerW])
            .padding(0.12)
    }, [innerW, bins])

    const yScale = useMemo(() => {
        if (!innerH || !bins.length) return null
        const yMax = Math.max(...bins.flatMap(b => [b.rb, b.vra]))
        return d3.scaleLinear()
            .domain([0, yMax > 0 ? yMax * 1.08 : 100])
            .range([innerH, 0])
            .nice()
    }, [innerH, bins])

    const yTicks = useMemo(() => (yScale ? yScale.ticks(6) : []), [yScale])

    if (!data || !bins.length) {
        return (
            <div className={`w-full rounded-xl border border-dashed border-brand-muted/30 bg-brand-surface/20 flex items-center justify-center ${className ?? 'h-full'}`}>
                <p className="text-brand-muted/50 text-sm italic">No histogram data available</p>
            </div>
        )
    }

    function handleMouseMove(e, bin) {
        if (!containerRef.current) return
        const rect = containerRef.current.getBoundingClientRect()
        setHovered({ bin, x: e.clientX - rect.left, y: e.clientY - rect.top })
    }

    const enactedBinX = (xScale && enactedCount != null) ? xScale(enactedCount) : null
    const enactedBinW = xScale ? xScale.bandwidth() : 0

    return (
        <div className={`w-full rounded-xl border border-brand-muted/25 shadow-sm bg-white flex flex-col ${className ?? 'h-full'}`}>

            <div className="flex flex-wrap items-center gap-4 px-4 pt-3 pb-1 shrink-0">
                <div className="flex items-center gap-1.5">
                    <span style={{ width: 14, height: 14, borderRadius: 3, background: RB_FILL, opacity: 0.8, display: 'inline-block', flexShrink: 0 }} />
                    <span style={{ fontSize: 12, fontWeight: 600, color: LABEL_COLOR }}>Race-Blind</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <span style={{ width: 14, height: 14, borderRadius: 3, background: VRA_FILL, opacity: 0.8, display: 'inline-block', flexShrink: 0 }} />
                    <span style={{ fontSize: 12, fontWeight: 600, color: LABEL_COLOR }}>VRA-Constrained</span>
                </div>
                {enactedCount != null && (
                    <div className="flex items-center gap-1.5">
                        <svg width="20" height="14">
                            <rect x={2} y={1} width={16} height={12} fill="none"
                                stroke={ENACTED_CLR} strokeWidth={2} strokeDasharray="4 3" rx={2} />
                        </svg>
                        <span style={{ fontSize: 12, fontWeight: 600, color: ENACTED_CLR }}>
                            Enacted ({enactedCount})
                        </span>
                    </div>
                )}
                <span className="ml-auto text-[11px] font-semibold text-slate-500 opacity-70 select-none">
                    {raceName} {metricLabel}
                </span>
            </div>

            <div
                ref={containerRef}
                className="flex-1 min-h-0 relative"
                onMouseLeave={() => setHovered({ bin: null, x: 0, y: 0 })}
            >
                <Tooltip hovered={hovered.bin} x={hovered.x} y={hovered.y} metricLabel={metricLabel} />

                {width > 0 && height > 0 && xScale && yScale && (
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
                                        fontSize={10} fontWeight={600} fill={LABEL_COLOR}>
                                        {t >= 1000 ? `${(t / 1000).toFixed(0)}k` : t}
                                    </text>
                                </g>
                            ))}
                            <text
                                transform={`translate(${-(MARGIN.left - 14)},${innerH / 2}) rotate(-90)`}
                                textAnchor="middle" fontSize={11} fontWeight={700} fill={LABEL_COLOR}
                            >
                                Number of Plans
                            </text>

                            <line x1={0} y1={innerH} x2={innerW} y2={innerH} stroke={AXIS_COLOR} strokeWidth={1.5} />
                            {bins.map(b => {
                                const cx = xScale(b.numEffective) + xScale.bandwidth() / 2
                                return (
                                    <g key={`xt-${b.numEffective}`}>
                                        <line x1={cx} y1={innerH} x2={cx} y2={innerH + 5} stroke={AXIS_COLOR} strokeWidth={1.5} />
                                        <text x={cx} y={innerH + 16} textAnchor="middle"
                                            fontSize={11} fontWeight={600} fill={LABEL_COLOR}>
                                            {b.numEffective}
                                        </text>
                                    </g>
                                )
                            })}
                            <text x={innerW / 2} y={innerH + MARGIN.bottom - 10}
                                textAnchor="middle" fontSize={11} fontWeight={700} fill={LABEL_COLOR}>
                                Number of {metricLabel} {raceName} Districts
                            </text>

                            {/* VRA bar drawn first (behind), RB bar drawn on top */}
                            {bins.map(b => {
                                const bx  = xScale(b.numEffective)
                                const bw  = xScale.bandwidth()
                                const yRB  = yScale(b.rb)
                                const yVRA = yScale(b.vra)
                                return (
                                    <g key={`bar-${b.numEffective}`}>
                                        <rect
                                            x={bx} y={yVRA}
                                            width={bw} height={Math.max(0, innerH - yVRA)}
                                            fill={VRA_FILL} fillOpacity={0.55}
                                            stroke={VRA_FILL} strokeWidth={1} strokeOpacity={0.8}
                                            rx={2}
                                        />
                                        <rect
                                            x={bx} y={yRB}
                                            width={bw} height={Math.max(0, innerH - yRB)}
                                            fill={RB_FILL} fillOpacity={0.55}
                                            stroke={RB_FILL} strokeWidth={1} strokeOpacity={0.8}
                                            rx={2}
                                        />
                                        <rect
                                            x={bx} y={0} width={bw} height={innerH}
                                            fill="transparent" style={{ cursor: 'crosshair' }}
                                            onMouseMove={e => handleMouseMove(e, b)}
                                            onMouseLeave={() => setHovered({ bin: null, x: 0, y: 0 })}
                                        />
                                    </g>
                                )
                            })}

                            {enactedBinX != null && (
                                <g>
                                    <rect
                                        x={enactedBinX} y={0}
                                        width={enactedBinW} height={innerH}
                                        fill="none"
                                        stroke={ENACTED_CLR} strokeWidth={2}
                                        strokeDasharray="5 4" strokeOpacity={0.85}
                                        rx={3}
                                    />
                                    <polygon
                                        points={`${enactedBinX + enactedBinW / 2 - 5},-10 ${enactedBinX + enactedBinW / 2 + 5},-10 ${enactedBinX + enactedBinW / 2},0`}
                                        fill={ENACTED_CLR} opacity={0.85}
                                    />
                                    <text
                                        x={enactedBinX + enactedBinW / 2} y={-14}
                                        textAnchor="middle" fontSize={10} fontWeight={700} fill={ENACTED_CLR}
                                    >
                                        Enacted
                                    </text>
                                </g>
                            )}

                        </g>
                    </svg>
                )}
            </div>
        </div>
    )
}
