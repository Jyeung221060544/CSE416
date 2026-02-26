/**
 * EIBarChart.jsx — Nivo grouped bar chart for EI peak support estimates.
 *
 * Shows peak KDE support estimates for Democratic and Republican candidates
 * grouped by racial group.  Bracket-style error bars show the 95% CI.
 * A dashed 50% threshold marker is drawn across all groups.
 *
 * Key visual elements:
 *   BgLayer  — Soft blue gradient background rectangle.
 *   CILayer  — Bracket error bars drawn on top of each bar.
 *   markers  — Nivo built-in dashed 50% threshold line.
 *
 * PROPS
 *   demCandidate {object|null} — Democratic candidate from eiData.candidates.
 *   repCandidate {object|null} — Republican candidate from eiData.candidates.
 *   activeRaces  {string[]}    — Race keys to include as bar groups.
 *   className    {string}      — Optional height class.
 */

import { useMemo } from 'react'
import { ResponsiveBar } from '@nivo/bar'
import { DEM_COLOR, REP_COLOR, AXIS_COLOR, LABEL_COLOR, THRESH_COLOR, RACE_LABELS, RACE_COLORS } from '@/lib/partyColors'


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


/* ── Step 1: Background layer ────────────────────────────────────────────── */

/**
 * BgLayer — Static gradient background for the bar chart.
 *
 * @param {{ innerWidth:number, innerHeight:number }} props — Injected by Nivo.
 */
function BgLayer({ innerWidth, innerHeight }) {
    return (
        <g>
            <defs><linearGradient id="eiBarBg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#eef6ff" /><stop offset="100%" stopColor="#f8fafc" /></linearGradient></defs>
            <rect width={innerWidth} height={innerHeight} fill="url(#eiBarBg)" rx={6} />
            <rect width={innerWidth} height={innerHeight} fill="none" stroke="#b6cfdf" strokeWidth={1.5} rx={6} />
        </g>
    )
}


/* ── Step 2: CI error bar layer ──────────────────────────────────────────── */

/**
 * CILayer — Draws bracket-style 95% CI error bars on top of each bar.
 *
 * Reads CI bounds from bar.data.data[`${party}CILow`] / [`${party}CIHigh`].
 *
 * @param {{ bars:object[], yScale:function }} props — Injected by Nivo.
 */
function CILayer({ bars, yScale }) {
    return (
        <g>
            {bars.map(bar => {
                const d    = bar.data.data
                const key  = bar.data.id   // 'Democratic' or 'Republican'
                const low  = d[`${key}CILow`]
                const high = d[`${key}CIHigh`]
                if (low == null || high == null) return null
                const cx = bar.x + bar.width/2
                const yL = yScale(low), yH = yScale(high)
                const cap = bar.width * 0.22
                const CI_COLOR = '#1e293b'  // dark slate — stands out on both party bars
                return (
                    <g key={bar.key}>
                        <line x1={cx} y1={yL} x2={cx} y2={yH} stroke={CI_COLOR} strokeWidth={2} strokeOpacity={0.75} />
                        <line x1={cx-cap} y1={yH} x2={cx+cap} y2={yH} stroke={CI_COLOR} strokeWidth={2} strokeOpacity={0.75} />
                        <line x1={cx-cap} y1={yL} x2={cx+cap} y2={yL} stroke={CI_COLOR} strokeWidth={2} strokeOpacity={0.75} />
                    </g>
                )
            })}
        </g>
    )
}


/* ── Step 3: Tooltip ─────────────────────────────────────────────────────── */

/**
 * EIBarTooltip — Shows party, race group, peak estimate, and 95% CI range.
 *
 * @param {{ id:string, value:number, data:object }} props
 *   id    — 'Democratic' or 'Republican'.
 *   value — Peak support estimate (0–1 decimal).
 *   data  — Full nivoData row with CI fields.
 */
function EIBarTooltip({ id, value, data }) {
    const color  = id === 'Democratic' ? DEM_COLOR : REP_COLOR
    const ciLow  = data[`${id}CILow`]
    const ciHigh = data[`${id}CIHigh`]
    const pct    = v => `${(v*100).toFixed(1)}%`
    return (
        <div style={{ background:'white', border:`2px solid ${color}`, borderRadius:8, padding:'8px 12px', boxShadow:'0 4px 16px rgba(0,0,0,0.13)', fontSize:12, minWidth:230, lineHeight:1.6, whiteSpace:'nowrap' }}>
            <div style={{ color, fontWeight:700, fontSize:11, textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:4 }}>{id} · {data.race}</div>
            <div style={{ color:'#475569' }}>Peak estimate: <strong style={{ color:LABEL_COLOR }}>{pct(value)}</strong></div>
            {ciLow != null && <div style={{ color:'#475569' }}>95% CI: <strong style={{ color:LABEL_COLOR }}>{pct(ciLow)} – {pct(ciHigh)}</strong></div>}
        </div>
    )
}


/* ── Step 4: Main component ──────────────────────────────────────────────── */

/**
 * EIBarChart — Grouped bar chart of peak EI support estimates by race.
 *
 * @param {{ demCandidate:object|null, repCandidate:object|null, activeRaces:string[], className:string }} props
 *   demCandidate — Democratic candidate from eiData.candidates.
 *   repCandidate — Republican candidate from eiData.candidates.
 *   activeRaces  — Race keys to display as grouped bars.
 *   className    — Optional height class.
 * @returns {JSX.Element}
 */
export default function EIBarChart({ demCandidate, repCandidate, activeRaces, className }) {

    /* ── Step 4a: Build Nivo data rows ───────────────────────────────────── */
    /*
     * Each row is one race group.  Democratic/Republican peak estimates + CI bounds
     * are stored as flat keys so CILayer and EIBarTooltip can read them from bar.data.data.
     */
    const nivoData = useMemo(() => {
        if (!demCandidate || !repCandidate) return []
        return activeRaces.map(race => {
            const dem = demCandidate.racialGroups.find(g => g.group.toLowerCase() === race)
            const rep = repCandidate.racialGroups.find(g => g.group.toLowerCase() === race)
            return {
                raceKey:race, race:RACE_LABELS[race]??race,
                Democratic:dem?.peakSupportEstimate??0, DemocraticCILow:dem?.confidenceIntervalLow??0, DemocraticCIHigh:dem?.confidenceIntervalHigh??0,
                Republican:rep?.peakSupportEstimate??0, RepublicanCILow:rep?.confidenceIntervalLow??0,  RepublicanCIHigh:rep?.confidenceIntervalHigh??0,
            }
        })
    }, [demCandidate, repCandidate, activeRaces])

    /* ── Step 4b: Render ─────────────────────────────────────────────────── */
    return (
        <div className={`w-full rounded-xl border border-brand-muted/25 shadow-sm bg-white flex flex-col ${className ?? 'h-[320px]'}`}>

            {/* ── LEGEND ROW ───────────────────────────────────────────────── */}
            <div className="flex items-center gap-5 px-4 pt-3 pb-1 flex-shrink-0">
                <div className="flex items-center gap-1.5"><span style={{ width:12, height:12, borderRadius:3, background:DEM_COLOR, display:'inline-block', flexShrink:0 }} /><span style={{ fontSize:12, fontWeight:600, color:LABEL_COLOR }}>Democratic</span></div>
                <div className="flex items-center gap-1.5"><span style={{ width:12, height:12, borderRadius:3, background:REP_COLOR, display:'inline-block', flexShrink:0 }} /><span style={{ fontSize:12, fontWeight:600, color:LABEL_COLOR }}>Republican</span></div>
                {/* CI bracket icon */}
                <div className="flex items-center gap-1.5 ml-2">
                    <svg width="14" height="16"><line x1="7" y1="0" x2="7" y2="16" stroke={AXIS_COLOR} strokeWidth={1.5} strokeOpacity={0.7} /><line x1="3" y1="1" x2="11" y2="1" stroke={AXIS_COLOR} strokeWidth={1.5} strokeOpacity={0.7} /><line x1="3" y1="15" x2="11" y2="15" stroke={AXIS_COLOR} strokeWidth={1.5} strokeOpacity={0.7} /></svg>
                    <span style={{ fontSize:11, fontWeight:500, color:THRESH_COLOR }}>95% CI</span>
                </div>
            </div>

            {/* ── GROUPED BAR CHART ────────────────────────────────────────── */}
            <div className="flex-1 min-h-0">
                <ResponsiveBar
                    data={nivoData} keys={['Democratic','Republican']} indexBy="race" groupMode="grouped"
                    margin={{ top:16, right:40, bottom:64, left:72 }} padding={0.28} innerPadding={4}
                    valueScale={{ type:'linear', min:0, max:1 }} indexScale={{ type:'band', round:true }}
                    colors={[DEM_COLOR, REP_COLOR]} borderRadius={3} borderWidth={2}
                    borderColor={({ data }) => RACE_COLORS[data.data.raceKey]??'#94a3b8'}
                    theme={NIVO_THEME}
                    layers={[ BgLayer, 'grid', 'axes', 'bars', CILayer, 'markers', 'legends' ]}
                    axisBottom={{ tickSize:6, tickPadding:5, legend:'Race Group', legendOffset:50, legendPosition:'middle' }}
                    axisLeft={{ tickSize:6, tickPadding:5, format:v=>`${Math.round(v*100)}%`, tickValues:[0,0.1,0.2,0.3,0.4,0.5,0.6,0.7,0.8,0.9,1], legend:'Vote Share Estimate', legendOffset:-58, legendPosition:'middle' }}
                    enableLabel={false} enableGridX={false}
                    markers={[{ axis:'y', value:0.5, lineStyle:{ stroke:THRESH_COLOR, strokeWidth:1.5, strokeDasharray:'8 5' }, legend:'50%', legendPosition:'right', legendOrientation:'horizontal', textStyle:{ fill:THRESH_COLOR, fontSize:10, fontWeight:700 } }]}
                    tooltip={EIBarTooltip} isInteractive
                />
            </div>
        </div>
    )
}
