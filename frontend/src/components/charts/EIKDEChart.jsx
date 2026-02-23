import { useMemo, useCallback } from 'react'
import { ResponsiveLine } from '@nivo/line'
import { DEM_COLOR, REP_COLOR, RACE_COLORS, RACE_LABELS, AXIS_COLOR, LABEL_COLOR } from '@/lib/partyColors'

// ── Nivo theme (mirrors GinglesScatterPlot) ───────────────────────────────────
const NIVO_THEME = {
    background: 'transparent',
    axis: {
        ticks: {
            line: { stroke: AXIS_COLOR, strokeWidth: 1.5 },
            text: { fill: LABEL_COLOR, fontWeight: 600, fontSize: 12 },
        },
        legend: {
            text: { fill: LABEL_COLOR, fontWeight: 700, fontSize: 13 },
        },
        domain: { line: { stroke: AXIS_COLOR, strokeWidth: 1.5 } },
    },
    grid: {
        line: { stroke: '#dce8f0', strokeWidth: 1, strokeDasharray: '3 4' },
    },
}

// ── Slice tooltip factory — captures candidate for party border colour ────────
function makeSliceTooltip(candidate) {
    const partyColor = candidate?.party === 'Democratic' ? DEM_COLOR : REP_COLOR
    const partyName  = candidate?.party ?? ''
    return function EISliceTooltip({ slice }) {
        const x   = slice.points[0]?.data.x
        const pts = [...slice.points].sort((a, b) => b.data.y - a.data.y)
        return (
            <div style={{
                background: 'white',
                border: `2px solid ${partyColor}`,
                borderRadius: 8,
                padding: '8px 12px',
                boxShadow: '0 4px 16px rgba(0,0,0,0.13)',
                fontSize: 12,
                minWidth: 200,
                lineHeight: 1.6,
            }}>
                <div style={{ color: partyColor, fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 3 }}>
                    {partyName}
                </div>
                <div style={{ color: '#475569', marginBottom: 5 }}>
                    Vote share: <strong style={{ color: LABEL_COLOR }}>{(x * 100).toFixed(1)}%</strong>
                </div>
                {pts.map(pt => {
                    const sid   = pt.seriesId ?? pt.serieId
                    const color = pt.seriesColor ?? pt.serieColor ?? RACE_COLORS[sid] ?? '#94a3b8'
                    return (
                        <div key={sid} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 1, color: '#475569' }}>
                            <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, display: 'inline-block', flexShrink: 0 }} />
                            <span style={{ flex: 1 }}>{RACE_LABELS[sid] ?? sid}</span>
                            <strong style={{ color: LABEL_COLOR }}>Density: {Number(pt.data.y).toFixed(2)}</strong>
                        </div>
                    )
                })}
            </div>
        )
    }
}

// ── CI marker layer ────────────────────────────────────────────────────────────
function makeCILayer(groupData) {
    return function CILayer({ xScale, innerHeight }) {
        return (
            <g>
                {groupData.map(({ group, ciLow, ciHigh }) => {
                    const color = RACE_COLORS[group] ?? '#94a3b8'
                    const x1 = xScale(ciLow)
                    const x2 = xScale(ciHigh)
                    return (
                        <g key={group}>
                            {/* Shaded CI band */}
                            <rect
                                x={x1} y={0} width={x2 - x1} height={innerHeight}
                                fill={color} fillOpacity={0.07}
                            />
                            {/* CI boundary lines */}
                            <line
                                x1={x1} y1={0} x2={x1} y2={innerHeight}
                                stroke={color} strokeWidth={1.5} strokeDasharray="5 4" strokeOpacity={0.55}
                            />
                            <line
                                x1={x2} y1={0} x2={x2} y2={innerHeight}
                                stroke={color} strokeWidth={1.5} strokeDasharray="5 4" strokeOpacity={0.55}
                            />
                        </g>
                    )
                })}
            </g>
        )
    }
}

// ── Background layer ───────────────────────────────────────────────────────────
function BgLayer({ innerWidth, innerHeight }) {
    return (
        <g>
            <defs>
                <linearGradient id="eiChartBg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor="#eef6ff" />
                    <stop offset="100%" stopColor="#f8fafc" />
                </linearGradient>
            </defs>
            <rect width={innerWidth} height={innerHeight} fill="url(#eiChartBg)" rx={6} />
            <rect width={innerWidth} height={innerHeight} fill="none" stroke="#b6cfdf" strokeWidth={1.5} rx={6} />
        </g>
    )
}

// ── Main component ─────────────────────────────────────────────────────────────
/**
 * Props:
 *  candidate   – one entry from eiData.candidates
 *  activeRaces – string[] of selected race keys
 *  yMax        – shared y-axis max (for synced y-scale across both charts)
 *  className   – optional height class
 */
export default function EIKDEChart({ candidate, activeRaces, yMax, className }) {
    if (!candidate) return null

    const partyColor = candidate.party === 'Democratic' ? DEM_COLOR : REP_COLOR

    // Filter to active races and build Nivo line series
    const nivoData = useMemo(() => {
        return activeRaces
            .map(race => {
                const group = candidate.racialGroups.find(
                    g => g.group.toLowerCase() === race
                )
                if (!group) return null
                return {
                    id: race,
                    data: group.kdePoints.map(p => ({ x: p.x, y: p.y })),
                }
            })
            .filter(Boolean)
    }, [candidate, activeRaces])

    // Build CI data for the custom layer
    const ciData = useMemo(() => {
        return activeRaces
            .map(race => {
                const group = candidate.racialGroups.find(
                    g => g.group.toLowerCase() === race
                )
                if (!group) return null
                return {
                    group: race,
                    ciLow:  group.confidenceIntervalLow,
                    ciHigh: group.confidenceIntervalHigh,
                }
            })
            .filter(Boolean)
    }, [candidate, activeRaces])

    const ciLayer      = useCallback(makeCILayer(ciData), [ciData])
    const sliceTooltip = useMemo(() => makeSliceTooltip(candidate), [candidate])

    return (
        <div className={`w-full rounded-xl border border-brand-muted/25 shadow-sm bg-white flex flex-col ${className ?? 'h-[380px]'}`}>

            {/* Header row */}
            <div className="flex items-center gap-2 px-4 pt-3 pb-1 flex-shrink-0 border-b border-brand-muted/10">
                <span style={{
                    width: 10, height: 10,
                    borderRadius: '50%',
                    background: partyColor,
                    display: 'inline-block',
                    flexShrink: 0,
                }} />
                <span className="text-sm font-bold" style={{ color: partyColor }}>
                    {candidate.candidateName}
                </span>
                <span className="text-xs text-slate-400 font-medium ml-1">
                    ({candidate.party})
                </span>
            </div>

            {/* Legend row */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 pt-2 pb-0 flex-shrink-0">
                {activeRaces.map(race => (
                    <div key={race} className="flex items-center gap-1.5">
                        <span style={{
                            width: 22, height: 3,
                            borderRadius: 2,
                            background: RACE_COLORS[race] ?? '#94a3b8',
                            display: 'inline-block',
                        }} />
                        <span style={{ fontSize: 11, fontWeight: 600, color: LABEL_COLOR }}>
                            {RACE_LABELS[race] ?? race}
                        </span>
                    </div>
                ))}
            </div>

            {/* Chart */}
            <div className="flex-1 min-h-0">
                {nivoData.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-brand-muted/50 text-sm italic">
                        Select at least one race group.
                    </div>
                ) : (
                    <ResponsiveLine
                        data={nivoData}
                        margin={{ top: 16, right: 28, bottom: 64, left: 72 }}

                        xScale={{ type: 'linear', min: 0, max: 1 }}
                        yScale={{ type: 'linear', min: 0, max: yMax ?? 'auto', stacked: false }}

                        curve="monotoneX"
                        enableArea
                        areaOpacity={0.18}

                        colors={({ id }) => RACE_COLORS[id] ?? '#94a3b8'}
                        lineWidth={2.5}

                        enablePoints={false}

                        theme={NIVO_THEME}

                        layers={[
                            BgLayer,
                            'grid',
                            ciLayer,
                            'axes',
                            'lines',
                            'areas',
                            'crosshair',
                            'slices',
                        ]}

                        axisBottom={{
                            tickSize: 6,
                            tickPadding: 5,
                            format: v => `${Math.round(v * 100)}%`,
                            tickValues: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1],
                            legend: 'Estimated Vote Share for Candidate',
                            legendOffset: 50,
                            legendPosition: 'middle',
                        }}
                        axisLeft={{
                            tickSize: 6,
                            tickPadding: 5,
                            format: v => v.toFixed(1),
                            tickValues: 5,
                            legend: 'Probability Density',
                            legendOffset: -58,
                            legendPosition: 'middle',
                        }}

                        gridXValues={[0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1]}

                        enableSlices="x"
                        sliceTooltip={sliceTooltip}
                        isInteractive
                    />
                )}
            </div>
        </div>
    )
}
