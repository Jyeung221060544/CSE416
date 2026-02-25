/**
 * EIKDEChart.jsx — Nivo line chart for Ecological Inference KDE density curves.
 *
 * Renders one KDE probability density curve per selected racial group for
 * a single candidate (Democratic or Republican).  Key visual elements:
 *
 *   BgLayer        — Soft blue gradient background rectangle.
 *   ciLayer        — Per-race shaded confidence-interval band with dashed borders.
 *   ResponsiveLine — Smooth area curves for each race's KDE points.
 *
 * The y-axis max (yMax) is shared between the Democratic and Republican chart
 * instances so they stay visually aligned (computed in RacialPolarizationSection).
 *
 * PROPS
 *   candidate   {object|null} — One entry from eiData.candidates.
 *   activeRaces {string[]}    — Race keys to render (from eiRaceFilter Zustand state).
 *   yMax        {number}      — Shared y-axis ceiling.
 *   className   {string}      — Optional height class.
 */

import { useMemo, useCallback } from 'react'
import { ResponsiveLine } from '@nivo/line'
import { DEM_COLOR, REP_COLOR, RACE_COLORS, RACE_LABELS, AXIS_COLOR, LABEL_COLOR } from '@/lib/partyColors'


/* ── Step 0: Nivo theme ──────────────────────────────────────────────────── */
const NIVO_THEME = {
    background: 'transparent',
    axis: {
        ticks: { line:{ stroke:AXIS_COLOR, strokeWidth:1.5 }, text:{ fill:LABEL_COLOR, fontWeight:600, fontSize:12 } },
        legend: { text:{ fill:LABEL_COLOR, fontWeight:700, fontSize:13 } },
        domain: { line:{ stroke:AXIS_COLOR, strokeWidth:1.5 } },
    },
    grid: { line:{ stroke:'#dce8f0', strokeWidth:1, strokeDasharray:'3 4' } },
}


/* ── Step 1: Slice tooltip factory ──────────────────────────────────────── */

/**
 * makeSliceTooltip — Returns a slice tooltip component bound to the given candidate.
 *
 * Shows party colour header, vote share at cursor x, and each race group's density.
 * Highlights the point nearest its peak estimate with a coloured "Peak" badge.
 *
 * @param {object|null} candidate — One eiData.candidates entry.
 * @returns {React.ComponentType}
 */
function makeSliceTooltip(candidate) {
    const partyColor = candidate?.party === 'Democratic' ? DEM_COLOR : REP_COLOR
    const partyName  = candidate?.party ?? ''
    const peakMap    = {}
    candidate?.racialGroups?.forEach(g => { peakMap[g.group.toLowerCase()] = g.peakSupportEstimate })

    return function EISliceTooltip({ slice }) {
        const x   = slice.points[0]?.data.x
        const pts = [...slice.points].sort((a,b) => b.data.y - a.data.y)
        return (
            <div style={{ background:'white', border:`2px solid ${partyColor}`, borderRadius:8, padding:'8px 12px', boxShadow:'0 4px 16px rgba(0,0,0,0.13)', fontSize:12, minWidth:200, lineHeight:1.6 }}>
                <div style={{ color:partyColor, fontWeight:700, fontSize:11, textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:3 }}>{partyName}</div>
                <div style={{ color:'#475569', marginBottom:5 }}>Vote share: <strong style={{ color:LABEL_COLOR }}>{(x*100).toFixed(1)}%</strong></div>
                {pts.map(pt => {
                    const sid    = pt.seriesId ?? pt.serieId
                    const color  = pt.seriesColor ?? pt.serieColor ?? RACE_COLORS[sid] ?? '#94a3b8'
                    const peak   = peakMap[sid]
                    const atPeak = peak != null && Math.abs(x - peak) < 0.026
                    return (
                        <div key={sid} style={{ display:'flex', alignItems:'center', gap:6, marginBottom:1, color:'#475569' }}>
                            <span style={{ width:8, height:8, borderRadius:'50%', background:color, display:'inline-block', flexShrink:0 }} />
                            <span style={{ flex:1 }}>
                                {RACE_LABELS[sid] ?? sid}
                                {atPeak && <span style={{ marginLeft:5, color, fontWeight:700, fontSize:10, background:`${color}18`, borderRadius:4, padding:'1px 5px', letterSpacing:'0.04em' }}>Peak</span>}
                            </span>
                            <strong style={{ color:LABEL_COLOR }}>Density: {Number(pt.data.y).toFixed(2)}</strong>
                        </div>
                    )
                })}
            </div>
        )
    }
}


/* ── Step 2: CI band layer factory ──────────────────────────────────────── */

/**
 * makeCILayer — Returns a layer that draws shaded CI bands for each active race.
 *
 * Each band is a translucent rect between ciLow and ciHigh on the x-axis,
 * with dashed vertical boundary lines.
 *
 * @param {Array<{ group:string, ciLow:number, ciHigh:number }>} groupData
 * @returns {React.ComponentType}
 */
function makeCILayer(groupData) {
    return function CILayer({ xScale, innerHeight }) {
        return (
            <g>
                {groupData.map(({ group, ciLow, ciHigh }) => {
                    const color = RACE_COLORS[group] ?? '#94a3b8'
                    const x1 = xScale(ciLow), x2 = xScale(ciHigh)
                    return (
                        <g key={group}>
                            <rect x={x1} y={0} width={x2-x1} height={innerHeight} fill={color} fillOpacity={0.07} />
                            <line x1={x1} y1={0} x2={x1} y2={innerHeight} stroke={color} strokeWidth={1.5} strokeDasharray="5 4" strokeOpacity={0.55} />
                            <line x1={x2} y1={0} x2={x2} y2={innerHeight} stroke={color} strokeWidth={1.5} strokeDasharray="5 4" strokeOpacity={0.55} />
                        </g>
                    )
                })}
            </g>
        )
    }
}


/* ── Step 3: Background layer ────────────────────────────────────────────── */

/**
 * BgLayer — Static gradient background for the KDE chart.
 *
 * @param {{ innerWidth:number, innerHeight:number }} props — Injected by Nivo.
 */
function BgLayer({ innerWidth, innerHeight }) {
    return (
        <g>
            <defs><linearGradient id="eiChartBg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#eef6ff" /><stop offset="100%" stopColor="#f8fafc" /></linearGradient></defs>
            <rect width={innerWidth} height={innerHeight} fill="url(#eiChartBg)" rx={6} />
            <rect width={innerWidth} height={innerHeight} fill="none" stroke="#b6cfdf" strokeWidth={1.5} rx={6} />
        </g>
    )
}


/* ── Step 4: Main component ──────────────────────────────────────────────── */

/**
 * EIKDEChart — KDE probability density line chart for one EI candidate.
 *
 * @param {{ candidate:object|null, activeRaces:string[], yMax:number, className:string }} props
 *   candidate   — One eiData.candidates entry (candidateName, party, racialGroups).
 *   activeRaces — Race keys to render as KDE overlay lines.
 *   yMax        — Shared y-axis ceiling from parent section.
 *   className   — Optional height class.
 * @returns {JSX.Element|null}
 */
export default function EIKDEChart({ candidate, activeRaces, yMax, className }) {
    if (!candidate) return null
    const partyColor = candidate.party === 'Democratic' ? DEM_COLOR : REP_COLOR

    /* ── Step 4a: Build Nivo line series — one per active race ───────────── */
    const nivoData = useMemo(() => activeRaces.map(race => {
        const group = candidate.racialGroups.find(g => g.group.toLowerCase() === race)
        if (!group) return null
        return { id:race, data: group.kdePoints.map(p => ({ x:p.x, y:p.y })) }
    }).filter(Boolean), [candidate, activeRaces])

    /* ── Step 4b: Build CI data for the custom layer ─────────────────────── */
    const ciData = useMemo(() => activeRaces.map(race => {
        const group = candidate.racialGroups.find(g => g.group.toLowerCase() === race)
        if (!group) return null
        return { group:race, ciLow:group.confidenceIntervalLow, ciHigh:group.confidenceIntervalHigh }
    }).filter(Boolean), [candidate, activeRaces])

    /* Memoize layers to prevent recreation every render */
    const ciLayer      = useCallback(makeCILayer(ciData), [ciData])
    const sliceTooltip = useMemo(() => makeSliceTooltip(candidate), [candidate])

    /* ── Step 4c: Render ─────────────────────────────────────────────────── */
    return (
        <div className={`w-full rounded-xl border border-brand-muted/25 shadow-sm bg-white flex flex-col ${className ?? 'h-[380px]'}`}>

            {/* ── CANDIDATE HEADER ─────────────────────────────────────────── */}
            <div className="flex items-center gap-2 px-4 pt-3 pb-1 flex-shrink-0 border-b border-brand-muted/10">
                <span style={{ width:10, height:10, borderRadius:'50%', background:partyColor, display:'inline-block', flexShrink:0 }} />
                <span className="text-sm font-bold" style={{ color:partyColor }}>{candidate.candidateName}</span>
                <span className="text-xs text-slate-400 font-medium ml-1">({candidate.party})</span>
            </div>

            {/* ── RACE LEGEND ──────────────────────────────────────────────── */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 pt-2 pb-0 flex-shrink-0">
                {activeRaces.map(race => (
                    <div key={race} className="flex items-center gap-1.5">
                        <span style={{ width:22, height:3, borderRadius:2, background:RACE_COLORS[race]??'#94a3b8', display:'inline-block' }} />
                        <span style={{ fontSize:11, fontWeight:600, color:LABEL_COLOR }}>{RACE_LABELS[race]??race}</span>
                    </div>
                ))}
            </div>

            {/* ── KDE LINE CHART ───────────────────────────────────────────── */}
            <div className="flex-1 min-h-0">
                {nivoData.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-brand-muted/50 text-sm italic">Select at least one race group.</div>
                ) : (
                    <ResponsiveLine
                        data={nivoData}
                        margin={{ top:16, right:28, bottom:64, left:72 }}
                        xScale={{ type:'linear', min:0, max:1 }}
                        yScale={{ type:'linear', min:0, max:yMax??'auto', stacked:false }}
                        curve="monotoneX" enableArea areaOpacity={0.18}
                        colors={({ id }) => RACE_COLORS[id]??'#94a3b8'} lineWidth={2.5}
                        enablePoints={false} theme={NIVO_THEME}
                        layers={[ BgLayer, 'grid', ciLayer, 'axes', 'lines', 'areas', 'crosshair', 'slices' ]}
                        axisBottom={{ tickSize:6, tickPadding:5, format:v=>`${Math.round(v*100)}%`, tickValues:[0,0.1,0.2,0.3,0.4,0.5,0.6,0.7,0.8,0.9,1], legend:'Estimated Vote Share', legendOffset:50, legendPosition:'middle' }}
                        axisLeft={{ tickSize:6, tickPadding:5, format:v=>v.toFixed(1), tickValues:5, legend:'Probability Density', legendOffset:-58, legendPosition:'middle' }}
                        gridXValues={[0,0.1,0.2,0.3,0.4,0.5,0.6,0.7,0.8,0.9,1]}
                        enableSlices="x" sliceTooltip={sliceTooltip} isInteractive
                    />
                )}
            </div>
        </div>
    )
}
