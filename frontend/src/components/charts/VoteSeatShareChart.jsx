/**
 * VoteSeatShareChart.jsx — Seats-votes responsiveness curve (McDonald & Best style).
 *
 * Plots two smooth S-shaped curves — one per party — showing how statewide
 * vote share translates to seat share under the redistricting plan.
 * A fair plan has both curves cross through (50%, 50%).  When the crossing
 * points are horizontally offset, partisan bias is present.
 *
 * KEY VISUAL ELEMENTS
 *   BgLayer          — Soft blue gradient background.
 *   propLineLayer    — Diagonal y=x proportionality reference (dashed gray).
 *   refLinesLayer    — 50%/50% crosshair guides (faint dashed).
 *   biasAnnotation   — Horizontal bracket + label showing the partisan bias gap.
 *   ResponsiveLine   — Two smooth monotone-X S-curves (Dem blue, Rep red).
 *   enactedPlanLayer — Enacted plan dot + annotation on the Democratic curve.
 *
 * DATA SHAPE (voteSeatData)
 *   {
 *     raciallyPolarized: boolean,
 *     totalDistricts:    number,
 *     partisanBias:      number,     // (demSeatShareAt50 − 0.5), negative = Dem disadvantage
 *     curves: [{
 *       party:  'Democratic' | 'Republican',
 *       points: [{ voteShare, seatShare }]
 *     }],
 *     enactedPlan: { democraticVoteShare, democraticSeatShare, label }
 *   }
 *
 * PROPS
 *   voteSeatData  {object|null} — Full voteSeatShare data bundle.
 *   className     {string}      — Optional height class.
 */

import { useMemo } from 'react'
import { ResponsiveLine } from '@nivo/line'
import {
    DEM_COLOR, DEM_DARK,
    REP_COLOR, REP_DARK,
    ENACTED_COLOR, THRESH_COLOR,
    AXIS_COLOR, LABEL_COLOR,
} from '@/lib/partyColors'


/* ── Step 0: Nivo theme ──────────────────────────────────────────────────── */
const NIVO_THEME = {
    background: 'transparent',
    axis: {
        ticks:  { line: { stroke: AXIS_COLOR, strokeWidth: 1.5 }, text: { fill: LABEL_COLOR, fontWeight: 600, fontSize: 12 } },
        legend: { text: { fill: LABEL_COLOR, fontWeight: 700, fontSize: 13 } },
        domain: { line: { stroke: AXIS_COLOR, strokeWidth: 1.5 } },
    },
    grid: { line: { stroke: '#dce8f0', strokeWidth: 1, strokeDasharray: '3 4' } },
}


/* ── Step 1: Background layer ────────────────────────────────────────────── */
function BgLayer({ innerWidth, innerHeight }) {
    return (
        <g>
            <defs>
                <linearGradient id="vssBg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor="#eef6ff" />
                    <stop offset="100%" stopColor="#f8fafc" />
                </linearGradient>
            </defs>
            <rect width={innerWidth} height={innerHeight} fill="url(#vssBg)" rx={6} />
            <rect width={innerWidth} height={innerHeight} fill="none" stroke="#b6cfdf" strokeWidth={1.5} rx={6} />
        </g>
    )
}


/* ── Step 2: 50%/50% reference crosshair ────────────────────────────────── */
function RefLinesLayer({ xScale, yScale, innerWidth, innerHeight }) {
    const x50 = xScale(0.5)
    const y50 = yScale(0.5)
    return (
        <g>
            <line x1={x50} y1={0} x2={x50} y2={innerHeight}
                stroke={THRESH_COLOR} strokeWidth={1}
                strokeDasharray="6 5" strokeOpacity={0.45} />
            <line x1={0} y1={y50} x2={innerWidth} y2={y50}
                stroke={THRESH_COLOR} strokeWidth={1}
                strokeDasharray="6 5" strokeOpacity={0.45} />
            <text x={x50 + 4} y={14} fontSize={9} fill={THRESH_COLOR} fontWeight={600} opacity={0.65}>50%</text>
            <text x={6} y={y50 - 5} fontSize={9} fill={THRESH_COLOR} fontWeight={600} opacity={0.65}>50%</text>
        </g>
    )
}


/* ── Step 4: Enacted plan dot ────────────────────────────────────────────── */
/**
 * makeEnactedPlanLayer — Dot + annotation at (democraticVoteShare, democraticSeatShare).
 *
 * @param {{ democraticVoteShare, democraticSeatShare, label }} enactedPlan
 * @returns {React.ComponentType}
 */
function makeEnactedPlanLayer(enactedPlan) {
    if (!enactedPlan) return () => null
    return function EnactedPlanLayer({ xScale, yScale }) {
        const cx   = xScale(enactedPlan.democraticVoteShare)
        const cy   = yScale(enactedPlan.democraticSeatShare)
        const pct  = v => `${(v * 100).toFixed(1)}%`
        return (
            <g>
                <circle cx={cx} cy={cy} r={14} fill={ENACTED_COLOR} fillOpacity={0.12} />
                <circle cx={cx} cy={cy} r={7} fill={ENACTED_COLOR} stroke="white" strokeWidth={2.5} />
                <text x={cx - 6} y={cy + 22} fontSize={11} fill={ENACTED_COLOR} fontWeight={700} textAnchor="middle">
                    {enactedPlan.label}
                </text>
                <text x={cx - 6} y={cy + 34} fontSize={10} fill="#64748b" textAnchor="middle">
                    {pct(enactedPlan.democraticVoteShare)} → {pct(enactedPlan.democraticSeatShare)} seats
                </text>
            </g>
        )
    }
}


/* ── Step 6: Slice tooltip ───────────────────────────────────────────────── */
function VSSTooltip({ slice }) {
    const demPt = slice.points.find(p => (p.seriesId ?? p.serieId) === 'Democratic')
    const repPt = slice.points.find(p => (p.seriesId ?? p.serieId) === 'Republican')
    const vs    = slice.points[0]?.data.x
    const pct   = v => `${(v * 100).toFixed(1)}%`
    const demSS = demPt?.data.y
    const repSS = repPt?.data.y
    const bias  = demSS != null && repSS != null ? ((demSS - 0.5) * 100).toFixed(1) : null
    return (
        <div style={{ background: 'white', border: '2px solid #94a3b8', borderRadius: 8, padding: '8px 12px', boxShadow: '0 4px 16px rgba(0,0,0,0.13)', fontSize: 12, minWidth: 220, lineHeight: 1.7 }}>
            <div style={{ color: '#334155', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>
                Vote Share: {pct(vs)}
            </div>
            {demPt && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#475569' }}>
                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: DEM_COLOR, display: 'inline-block', flexShrink: 0 }} />
                    <span style={{ flex: 1 }}>Democratic seats:</span>
                    <strong style={{ color: DEM_DARK }}>{pct(demSS)}</strong>
                </div>
            )}
            {repPt && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#475569' }}>
                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: REP_COLOR, display: 'inline-block', flexShrink: 0 }} />
                    <span style={{ flex: 1 }}>Republican seats:</span>
                    <strong style={{ color: REP_DARK }}>{pct(repSS)}</strong>
                </div>
            )}
            {bias !== null && (
                <div style={{ color: Number(bias) < 0 ? REP_DARK : DEM_DARK, fontWeight: 600, fontSize: 11, marginTop: 5, borderTop: '1px solid #e2e8f0', paddingTop: 4 }}>
                    {Number(bias) < 0
                        ? `Rep advantage: ${Math.abs(Number(bias)).toFixed(1)}% at this vote share`
                        : Number(bias) > 0
                            ? `Dem advantage: ${bias}% at this vote share`
                            : 'Balanced at this vote share'}
                </div>
            )}
        </div>
    )
}


/* ── Step 7: Main component ──────────────────────────────────────────────── */

/**
 * VoteSeatShareChart — Partisan seats-votes responsiveness curve.
 *
 * Rendered only when raciallyPolarized === true for the current state.
 * The parent tab is disabled for states that do not satisfy Gingles 2/3.
 *
 * @param {{ voteSeatData: object|null, className: string }} props
 * @returns {JSX.Element}
 */
export default function VoteSeatShareChart({ voteSeatData, className }) {

    const curves      = voteSeatData?.curves      ?? []
    const enactedPlan = voteSeatData?.enactedPlan ?? null
    const partisanBias = voteSeatData?.partisanBias ?? null

    /* ── Step 7a: Build Nivo line series — one per party ────────────────── */
    const nivoData = useMemo(() =>
        curves.map(c => ({
            id:   c.party,
            data: c.points.map(p => ({ x: p.voteShare, y: p.seatShare })),
        }))
    , [curves])

    /* ── Step 7b: Custom layers (memoized) ──────────────────────────────── */
    const enactedPlanLayer = useMemo(() => makeEnactedPlanLayer(enactedPlan), [enactedPlan])

    /* ── Step 7d: Empty guard ────────────────────────────────────────────── */
    if (!curves.length) {
        return (
            <div className={`w-full rounded-xl border border-brand-muted/25 shadow-sm bg-white flex items-center justify-center ${className ?? 'h-[420px]'}`}>
                <span className="text-brand-muted/50 text-sm italic">No vote/seat share data available.</span>
            </div>
        )
    }

    const biasLabel = partisanBias != null
        ? partisanBias < -0.005
            ? `Rep advantage ${(Math.abs(partisanBias) * 100).toFixed(1)}% at 50% vote share`
            : partisanBias > 0.005
                ? `Dem advantage ${(partisanBias * 100).toFixed(1)}% at 50% vote share`
                : 'No significant partisan bias'
        : null

    /* ── Step 7e: Render ─────────────────────────────────────────────────── */
    return (
        <div className={`w-full rounded-xl border border-brand-muted/25 shadow-sm bg-white flex flex-col ${className ?? 'h-[420px]'}`}>

            {/* ── HEADER ─────────────────────────────────────────────────── */}
            <div className="flex items-center gap-3 px-4 pt-3 pb-1 flex-shrink-0 border-b border-brand-muted/10 flex-wrap">
                <span className="text-base font-bold text-brand-deep">Seats-Votes Curve</span>
                {biasLabel && (
                    <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${
                        partisanBias < -0.005
                            ? 'bg-red-50 text-red-700 border-red-200'
                            : partisanBias > 0.005
                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                : 'bg-slate-50 text-slate-500 border-slate-200'
                    }`}>
                        {biasLabel}
                    </span>
                )}
                <span className="text-xs text-slate-400 italic ml-auto">
                    {voteSeatData?.electionYear ?? ''}
                </span>
            </div>

            {/* ── LEGEND ─────────────────────────────────────────────────── */}
            <div className="flex flex-wrap items-center gap-x-5 gap-y-1 px-4 pt-2 pb-0 flex-shrink-0">
                <div className="flex items-center gap-1.5">
                    <span style={{ width: 22, height: 3, borderRadius: 2, background: DEM_COLOR, display: 'inline-block' }} />
                    <span style={{ fontSize: 11, fontWeight: 600, color: LABEL_COLOR }}>Democratic</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <span style={{ width: 22, height: 3, borderRadius: 2, background: REP_COLOR, display: 'inline-block' }} />
                    <span style={{ fontSize: 11, fontWeight: 600, color: LABEL_COLOR }}>Republican</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: ENACTED_COLOR, display: 'inline-block', flexShrink: 0 }} />
                    <span style={{ fontSize: 11, fontWeight: 600, color: LABEL_COLOR }}>Enacted Plan</span>
                </div>
            </div>

            {/* ── CHART ──────────────────────────────────────────────────── */}
            <div className="flex-1 min-h-0">
                <ResponsiveLine
                    data={nivoData}
                    margin={{ top: 20, right: 72, bottom: 68, left: 72 }}
                    xScale={{ type: 'linear', min: 0, max: 1 }}
                    yScale={{ type: 'linear', min: 0, max: 1 }}
                    curve="monotoneX"
                    colors={[DEM_COLOR, REP_COLOR]}
                    lineWidth={2.5}
                    enablePoints={false}
                    theme={NIVO_THEME}
                    layers={[
                        BgLayer,
                        RefLinesLayer,
                        'grid',
                        'axes',
                        'lines',
                        enactedPlanLayer,
                        'crosshair',
                        'slices',
                    ]}
                    axisBottom={{
                        tickSize: 6,
                        tickPadding: 5,
                        format: v => `${Math.round(v * 100)}%`,
                        tickValues: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1],
                        legend: 'Party Vote Share',
                        legendOffset: 52,
                        legendPosition: 'middle',
                    }}
                    axisLeft={{
                        tickSize: 6,
                        tickPadding: 5,
                        format: v => `${Math.round(v * 100)}%`,
                        tickValues: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1],
                        legend: 'Party Seat Share',
                        legendOffset: -58,
                        legendPosition: 'middle',
                    }}
                    gridXValues={[0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1]}
                    gridYValues={[0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1]}
                    enableSlices="x"
                    sliceTooltip={VSSTooltip}
                    isInteractive
                />
            </div>
        </div>
    )
}
