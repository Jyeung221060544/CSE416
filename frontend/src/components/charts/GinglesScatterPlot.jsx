import { useMemo, useCallback } from 'react'
import { ResponsiveScatterPlot } from '@nivo/scatterplot'
import * as d3 from 'd3'
import { DEM_COLOR, DEM_DARK, REP_COLOR, REP_DARK, THRESH_COLOR, AXIS_COLOR, LABEL_COLOR } from '@/lib/partyColors'

function getSeries(ginglesData, raceFilter) {
    const byRace = ginglesData?.feasibleSeriesByRace ?? {}
    return byRace[raceFilter] ?? byRace.black ?? null
}

// ── Tooltip ──────────────────────────────────────────────────────────────────
function GinglesTooltip({ node }) {
    const isDem  = node.serieId === 'Democratic'
    const color  = isDem ? DEM_COLOR : REP_COLOR
    const dark   = isDem ? DEM_DARK  : REP_DARK
    const pct    = v => `${(v * 100).toFixed(1)}%`
    return (
        <div style={{
            background: 'white',
            border: `2px solid ${color}`,
            borderRadius: 8,
            padding: '8px 12px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.13)',
            fontSize: 13,
            minWidth: 190,
            lineHeight: 1.6,
        }}>
            <div style={{ color, fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>
                {node.serieId}
            </div>
            <div style={{ color: '#1e293b', fontWeight: 600, marginBottom: 4 }}>
                {node.data.name}
            </div>
            <div style={{ color: '#475569', fontSize: 12 }}>
                <div>Minority VAP: <strong style={{ color: dark }}>{pct(node.data.x)}</strong></div>
                <div>Vote Share:&nbsp;&nbsp;&nbsp;<strong style={{ color: dark }}>{pct(node.data.y)}</strong></div>
            </div>
        </div>
    )
}

// ── Nivo theme ────────────────────────────────────────────────────────────────
const NIVO_THEME = {
    background: 'transparent',
    axis: {
        ticks: {
            line: { stroke: AXIS_COLOR, strokeWidth: 1.5 },
            text: { fill: LABEL_COLOR, fontWeight: 600, fontSize: 13 },
        },
        legend: {
            text: { fill: LABEL_COLOR, fontWeight: 700, fontSize: 14 },
        },
        domain: { line: { stroke: AXIS_COLOR, strokeWidth: 1.5 } },
    },
    grid: {
        line: { stroke: '#dce8f0', strokeWidth: 1, strokeDasharray: '3 4' },
    },
    legends: {
        text: { fontWeight: 600, fontSize: 13 },
    },
}

// ── Main component ────────────────────────────────────────────────────────────
export default function GinglesScatterPlot({ ginglesData, raceFilter, selectedId, onDotClick, className }) {
    const series   = getSeries(ginglesData, raceFilter)
    const points   = series?.points ?? []
    const demTrend = series?.democraticTrendline ?? []
    const repTrend = series?.republicanTrendline ?? []

    const raceName = raceFilter
        ? raceFilter.charAt(0).toUpperCase() + raceFilter.slice(1)
        : 'Minority'

    // ── Nivo data ─────────────────────────────────────────────────────────────
    const nivoData = useMemo(() => {
        if (!points.length) return []
        return [
            {
                id: 'Democratic',
                data: points.map(p => ({ x: p.x, y: p.y,       precinctId: p.id, name: p.name })),
            },
            {
                id: 'Republican',
                data: points.map(p => ({ x: p.x, y: 1 - p.y,   precinctId: p.id, name: p.name })),
            },
        ]
    }, [points])

    // ── Custom layers ─────────────────────────────────────────────────────────

    // Background gradient
    const bgLayer = useCallback(({ innerWidth, innerHeight }) => (
        <g>
            <defs>
                <linearGradient id="ginglesPlotBg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor="#eef6ff" />
                    <stop offset="100%" stopColor="#f8fafc" />
                </linearGradient>
            </defs>
            <rect width={innerWidth} height={innerHeight} fill="url(#ginglesPlotBg)" rx={6} />
            <rect width={innerWidth} height={innerHeight} fill="none" stroke="#b6cfdf" strokeWidth={1.5} rx={6} />
        </g>
    ), [])

    // 50% majority threshold
    const thresholdLayer = useCallback(({ yScale, innerWidth }) => {
        const y = yScale(0.5)
        return (
            <g>
                <line
                    x1={0} y1={y} x2={innerWidth} y2={y}
                    stroke={THRESH_COLOR} strokeWidth={2} strokeDasharray="10 6"
                />
                <text
                    x={innerWidth - 6} y={y - 7}
                    textAnchor="end" fontSize={11} fill={THRESH_COLOR} fontWeight="700"
                >
                    50% Majority
                </text>
            </g>
        )
    }, [])

    // Non-linear regression trendlines
    const trendlineLayer = useCallback(({ xScale, yScale }) => {
        const lineGen = d3.line()
            .x(p => xScale(p.x))
            .y(p => yScale(p.y))
            .curve(d3.curveMonotoneX)
        const dPath = demTrend.length ? lineGen(demTrend) : null
        const rPath = repTrend.length ? lineGen(repTrend) : null
        return (
            <g>
                {/* Glow halos */}
                {rPath && <path d={rPath} fill="none" stroke={REP_COLOR} strokeWidth={10} strokeLinecap="round" strokeOpacity={0.10} />}
                {dPath && <path d={dPath} fill="none" stroke={DEM_COLOR} strokeWidth={10} strokeLinecap="round" strokeOpacity={0.10} />}
                {/* Main trendlines */}
                {rPath && <path d={rPath} fill="none" stroke={REP_COLOR} strokeWidth={2.5} strokeLinecap="round" />}
                {dPath && <path d={dPath} fill="none" stroke={DEM_COLOR} strokeWidth={2.5} strokeLinecap="round" />}
            </g>
        )
    }, [demTrend, repTrend])

    // Custom nodes with selected-state styling
    const customNodesLayer = useCallback(({ nodes }) => (
        <g>
            {nodes.map(node => {
                const isSel = node.data.precinctId === selectedId
                const isDem = node.serieId === 'Democratic'
                const fill  = isDem ? DEM_COLOR : REP_COLOR
                const dark  = isDem ? DEM_DARK  : REP_DARK
                return (
                    <circle
                        key={node.id}
                        cx={node.x}
                        cy={node.y}
                        r={isSel ? 9 : 5.5}
                        fill={fill}
                        fillOpacity={isSel ? 0.90 : 0.30}
                        stroke={dark}
                        strokeWidth={isSel ? 2.5 : 1.2}
                        strokeOpacity={isSel ? 1 : 0.50}
                        style={{ cursor: 'pointer', transition: 'r 0.15s, fill-opacity 0.15s' }}
                    />
                )
            })}
        </g>
    ), [selectedId])

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div className={`w-full rounded-xl border border-brand-muted/25 shadow-sm bg-white flex flex-col ${className ?? 'h-[404px]'}`}>
            {points.length === 0 ? (
                <div className="h-full flex items-center justify-center text-brand-muted/60 text-sm italic">
                    No Gingles scatter data available for this race.
                </div>
            ) : (
                <>
                    {/* Legend row */}
                    <div className="flex items-center gap-5 px-4 pt-3 pb-1 flex-shrink-0">
                        <div className="flex items-center gap-1.5">
                            <span style={{ width: 10, height: 10, borderRadius: '50%', background: DEM_COLOR, display: 'inline-block', flexShrink: 0 }} />
                            <span style={{ fontSize: 12, fontWeight: 600, color: LABEL_COLOR }}>Democratic</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span style={{ width: 10, height: 10, borderRadius: '50%', background: REP_COLOR, display: 'inline-block', flexShrink: 0 }} />
                            <span style={{ fontSize: 12, fontWeight: 600, color: LABEL_COLOR }}>Republican</span>
                        </div>
                        <span className="ml-auto text-[11px] font-semibold text-slate-500 opacity-70 select-none">
                            n = {points.length} precincts
                        </span>
                    </div>

                    {/* Chart fills remaining height */}
                    <div className="flex-1 min-h-0">
                        <ResponsiveScatterPlot
                            data={nivoData}
                            margin={{ top: 16, right: 36, bottom: 64, left: 72 }}
                            xScale={{ type: 'linear', min: 0, max: 1 }}
                            yScale={{ type: 'linear', min: 0, max: 1 }}
                            colors={[DEM_COLOR, REP_COLOR]}
                            theme={NIVO_THEME}

                            layers={[
                                bgLayer,
                                'grid',
                                'axes',
                                thresholdLayer,
                                trendlineLayer,
                                customNodesLayer,
                                'mesh',
                            ]}

                            gridXValues={[0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1]}
                            gridYValues={[0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1]}

                            axisBottom={{
                                tickSize: 6,
                                tickPadding: 5,
                                format: v => `${Math.round(v * 100)}%`,
                                tickValues: [0, 0.25, 0.5, 0.75, 1],
                                legend: `${raceName} Group VAP Share`,
                                legendOffset: 50,
                                legendPosition: 'middle',
                            }}
                            axisLeft={{
                                tickSize: 6,
                                tickPadding: 5,
                                format: v => `${Math.round(v * 100)}%`,
                                tickValues: [0, 0.25, 0.5, 0.75, 1],
                                legend: 'Vote Share',
                                legendOffset: -58,
                                legendPosition: 'middle',
                            }}

                            tooltip={GinglesTooltip}
                            isInteractive
                            onClick={node => onDotClick?.(
                                node.data.precinctId === selectedId ? null : node.data.precinctId
                            )}
                        />
                    </div>
                </>
            )}
        </div>
    )
}
