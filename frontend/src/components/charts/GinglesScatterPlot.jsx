/**
 * GinglesScatterPlot.jsx — Nivo scatter plot for Gingles precinct analysis.
 *
 * Plots two series per precinct (Democratic + Republican vote share) against
 * the minority VAP percentage on the x-axis.  Key visual elements:
 *
 *   bgLayer          — Soft blue gradient background rectangle.
 *   thresholdLayer   — Dashed 50% majority line.
 *   trendlineLayer   — Smoothed D3 monotone-X trendlines for each party.
 *   customNodesLayer — Custom circle nodes with selected-state styling and
 *                      hover-only tooltip (Nivo's built-in tooltip is disabled).
 *
 * INTERACTION
 *   Clicking a dot toggles its selection and syncs with GinglesPrecinctTable
 *   via selectedId / onDotClick props.
 *
 * PROPS
 *   ginglesData {object}          — Full ginglesPrecinct bundle.
 *   raceFilter  {string}          — Active race key (e.g. 'black').
 *   selectedId  {string|null}     — Currently highlighted precinct id.
 *   onDotClick  {(id) => void}    — Fired when a dot is clicked.
 *   className   {string}          — Optional height class.
 */

import { useMemo, useCallback, useState, useRef } from 'react'
import { ResponsiveScatterPlot } from '@nivo/scatterplot'
import * as d3 from 'd3'
import { DEM_COLOR, DEM_DARK, REP_COLOR, REP_DARK, THRESH_COLOR, AXIS_COLOR, LABEL_COLOR } from '@/lib/partyColors'


/* ── Step 0: Helpers ─────────────────────────────────────────────────────── */

/**
 * getSeries — Extracts the active race series from the gingles data bundle.
 *
 * Falls back to 'black' if the requested raceFilter key doesn't exist.
 *
 * @param {object|null} ginglesData — Full ginglesPrecinct data bundle.
 * @param {string}      raceFilter  — Race key to look up (e.g. 'black').
 * @returns {object|null}
 */
function getSeries(ginglesData, raceFilter) {
    const byRace = ginglesData?.feasibleSeriesByRace ?? {}
    return byRace[raceFilter] ?? byRace.black ?? null
}


/* ── Step 1: Tooltip ─────────────────────────────────────────────────────── */

/**
 * GinglesTooltip — HTML tooltip positioned absolutely over hovered dots.
 *
 * @param {{ node: object }} props
 *   node — Nivo node with serieId, data.name, data.x (VAP%), data.y (vote share%).
 * @returns {JSX.Element}
 */
function GinglesTooltip({ node }) {
    const isDem = node.serieId === 'Democratic'
    const color = isDem ? DEM_COLOR : REP_COLOR
    const dark  = isDem ? DEM_DARK  : REP_DARK
    const pct   = v => `${(v * 100).toFixed(1)}%`
    return (
        <div style={{ background:'white', border:`2px solid ${color}`, borderRadius:8, padding:'8px 12px', boxShadow:'0 4px 16px rgba(0,0,0,0.13)', fontSize:13, minWidth:190, lineHeight:1.6 }}>
            <div style={{ color, fontWeight:700, fontSize:11, textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:4 }}>{node.serieId}</div>
            <div style={{ color:'#1e293b', fontWeight:600, marginBottom:4 }}>{node.data.name}</div>
            <div style={{ color:'#475569', fontSize:12 }}>
                <div>Minority VAP: <strong style={{ color:dark }}>{pct(node.data.x)}</strong></div>
                <div>Vote Share:&nbsp;&nbsp;&nbsp;<strong style={{ color:dark }}>{pct(node.data.y)}</strong></div>
            </div>
        </div>
    )
}


/* ── Step 2: Nivo theme ──────────────────────────────────────────────────── */
const NIVO_THEME = {
    background: 'transparent',
    axis: {
        ticks: { line:{ stroke:AXIS_COLOR, strokeWidth:1.5 }, text:{ fill:LABEL_COLOR, fontWeight:600, fontSize:13 } },
        legend: { text:{ fill:LABEL_COLOR, fontWeight:700, fontSize:14 } },
        domain: { line:{ stroke:AXIS_COLOR, strokeWidth:1.5 } },
    },
    grid: { line:{ stroke:'#dce8f0', strokeWidth:1, strokeDasharray:'3 4' } },
    legends: { text:{ fontWeight:600, fontSize:13 } },
}


/* ── Step 3: Main component ──────────────────────────────────────────────── */

/**
 * GinglesScatterPlot — Interactive scatter plot for Gingles minority VAP analysis.
 *
 * @param {{ ginglesData:object|null, raceFilter:string, selectedId:string|null, onDotClick:(id)=>void, className:string }} props
 * @returns {JSX.Element}
 */
export default function GinglesScatterPlot({ ginglesData, raceFilter, selectedId, onDotClick, className }) {
    const series   = getSeries(ginglesData, raceFilter)
    const points   = series?.points ?? []
    const demTrend = series?.democraticTrendline ?? []
    const repTrend = series?.republicanTrendline ?? []
    const containerRef = useRef(null)
    const [tooltip, setTooltip] = useState(null)
    const raceName = raceFilter ? raceFilter.charAt(0).toUpperCase() + raceFilter.slice(1) : 'Minority'

    /* ── Step 3a: Build Nivo data — two nodes per precinct (Dem + Rep) ──── */
    const nivoData = useMemo(() => {
        if (!points.length) return []
        return [
            { id:'Democratic', data: points.map(p => ({ x:p.x, y:p.y,     precinctId:p.id, name:p.name })) },
            { id:'Republican', data: points.map(p => ({ x:p.x, y:1-p.y,   precinctId:p.id, name:p.name })) },
        ]
    }, [points])

    /* ── Step 3b: Custom SVG layers ──────────────────────────────────────── */

    /* bgLayer — gradient background rectangle */
    const bgLayer = useCallback(({ innerWidth, innerHeight }) => (
        <g>
            <defs><linearGradient id="ginglesPlotBg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#eef6ff" /><stop offset="100%" stopColor="#f8fafc" /></linearGradient></defs>
            <rect width={innerWidth} height={innerHeight} fill="url(#ginglesPlotBg)" rx={6} />
            <rect width={innerWidth} height={innerHeight} fill="none" stroke="#b6cfdf" strokeWidth={1.5} rx={6} />
        </g>
    ), [])

    /* thresholdLayer — dashed 50% majority horizontal line */
    const thresholdLayer = useCallback(({ yScale, innerWidth }) => {
        const y = yScale(0.5)
        return (
            <g>
                <line x1={0} y1={y} x2={innerWidth} y2={y} stroke={THRESH_COLOR} strokeWidth={2} strokeDasharray="10 6" />
                <text x={innerWidth-6} y={y-7} textAnchor="end" fontSize={11} fill={THRESH_COLOR} fontWeight="700">50% Majority</text>
            </g>
        )
    }, [])

    /* trendlineLayer — D3 monotone-X smoothed trendlines with glow halos */
    const trendlineLayer = useCallback(({ xScale, yScale }) => {
        const lineGen = d3.line().x(p=>xScale(p.x)).y(p=>yScale(p.y)).curve(d3.curveMonotoneX)
        const dPath = demTrend.length ? lineGen(demTrend) : null
        const rPath = repTrend.length ? lineGen(repTrend) : null
        return (
            <g>
                {rPath && <path d={rPath} fill="none" stroke={REP_COLOR} strokeWidth={10} strokeLinecap="round" strokeOpacity={0.10} />}
                {dPath && <path d={dPath} fill="none" stroke={DEM_COLOR} strokeWidth={10} strokeLinecap="round" strokeOpacity={0.10} />}
                {rPath && <path d={rPath} fill="none" stroke={REP_COLOR} strokeWidth={2.5} strokeLinecap="round" />}
                {dPath && <path d={dPath} fill="none" stroke={DEM_COLOR} strokeWidth={2.5} strokeLinecap="round" />}
            </g>
        )
    }, [demTrend, repTrend])

    /*
     * customNodesLayer — Replaces Nivo's default node rendering.
     * Selected dots are enlarged (r=9) and fully opaque.
     * Clicking toggles selection; second click deselects.
     */
    const customNodesLayer = useCallback(({ nodes }) => (
        <g>
            {nodes.map(node => {
                const isSel = node.data.precinctId === selectedId
                const isDem = node.serieId === 'Democratic'
                const fill  = isDem ? DEM_COLOR : REP_COLOR
                const dark  = isDem ? DEM_DARK  : REP_DARK
                return (
                    <circle
                        key={node.id} cx={node.x} cy={node.y}
                        r={isSel ? 9 : 5.5}
                        fill={fill} fillOpacity={isSel ? 0.90 : 0.30}
                        stroke={dark} strokeWidth={isSel ? 2.5 : 1.2} strokeOpacity={isSel ? 1 : 0.50}
                        style={{ cursor:'pointer', transition:'r 0.15s, fill-opacity 0.15s' }}
                        onMouseEnter={(e) => { if(!containerRef.current) return; const r=containerRef.current.getBoundingClientRect(); setTooltip({ node, left:e.clientX-r.left+14, top:e.clientY-r.top-60 }) }}
                        onMouseMove={(e)  => { if(!containerRef.current) return; const r=containerRef.current.getBoundingClientRect(); setTooltip(prev=>prev?{...prev, left:e.clientX-r.left+14, top:e.clientY-r.top-60}:null) }}
                        onMouseLeave={() => setTooltip(null)}
                        onClick={() => onDotClick?.(node.data.precinctId === selectedId ? null : node.data.precinctId)}
                    />
                )
            })}
        </g>
    ), [selectedId, onDotClick, setTooltip])

    /* ── Step 3c: Render ─────────────────────────────────────────────────── */
    return (
        <div ref={containerRef} className={`w-full rounded-xl border border-brand-muted/25 shadow-sm bg-white flex flex-col relative ${className ?? 'h-[404px]'}`}>
            {/* Hover-only tooltip — absolutely positioned, pointer-events none */}
            {tooltip && (
                <div style={{ position:'absolute', left:tooltip.left, top:tooltip.top, zIndex:10, pointerEvents:'none' }}>
                    <GinglesTooltip node={tooltip.node} />
                </div>
            )}
            {points.length === 0 ? (
                <div className="h-full flex items-center justify-center text-brand-muted/60 text-sm italic">No Gingles scatter data available for this race.</div>
            ) : (
                <>
                    {/* ── LEGEND ─────────────────────────────────────────── */}
                    <div className="flex items-center gap-5 px-4 pt-3 pb-1 flex-shrink-0">
                        <div className="flex items-center gap-1.5"><span style={{ width:10, height:10, borderRadius:'50%', background:DEM_COLOR, display:'inline-block', flexShrink:0 }} /><span style={{ fontSize:12, fontWeight:600, color:LABEL_COLOR }}>Democratic</span></div>
                        <div className="flex items-center gap-1.5"><span style={{ width:10, height:10, borderRadius:'50%', background:REP_COLOR, display:'inline-block', flexShrink:0 }} /><span style={{ fontSize:12, fontWeight:600, color:LABEL_COLOR }}>Republican</span></div>
                        <span className="ml-auto text-[11px] font-semibold text-slate-500 opacity-70 select-none">{points.length} Precincts Plotted</span>
                    </div>
                    {/* ── CHART — 'mesh' omitted; tooltip + click handled per-circle ── */}
                    <div className="flex-1 min-h-0">
                        <ResponsiveScatterPlot
                            data={nivoData}
                            margin={{ top:16, right:36, bottom:64, left:72 }}
                            xScale={{ type:'linear', min:0, max:1 }}
                            yScale={{ type:'linear', min:0, max:1 }}
                            colors={[DEM_COLOR, REP_COLOR]}
                            theme={NIVO_THEME}
                            layers={[ bgLayer, 'grid', 'axes', thresholdLayer, trendlineLayer, customNodesLayer ]}
                            gridXValues={[0,0.1,0.2,0.3,0.4,0.5,0.6,0.7,0.8,0.9,1]}
                            gridYValues={[0,0.1,0.2,0.3,0.4,0.5,0.6,0.7,0.8,0.9,1]}
                            axisBottom={{ tickSize:6, tickPadding:5, format:v=>`${Math.round(v*100)}%`, tickValues:[0,0.25,0.5,0.75,1], legend:`% ${raceName} Population for Precinct`, legendOffset:50, legendPosition:'middle' }}
                            axisLeft={{ tickSize:6, tickPadding:5, format:v=>`${Math.round(v*100)}%`, tickValues:[0,0.25,0.5,0.75,1], legend:'Vote Share per Party', legendOffset:-58, legendPosition:'middle' }}
                            isInteractive={false}
                        />
                    </div>
                </>
            )}
        </div>
    )
}
