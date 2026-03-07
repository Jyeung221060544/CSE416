/**
 * EnsembleSplitCompareChart.jsx — Grouped bar chart overlaying Race-Blind and
 * VRA-Constrained ensemble splits side-by-side for each R-D split outcome.
 *
 * Pure renderer — all data merging happens in EnsembleAnalysisSection.
 *
 * Visual encoding
 *   Fill color  — constant per ensemble type (not party):
 *                   Race-Blind    → dark green  (COMPARE_RB_COLOR)
 *                   VRA-Constrained → dark purple (COMPARE_VRA_COLOR)
 *   Border color — party majority of the split outcome:
 *                   R-majority → REP_COLOR (red)
 *                   D-majority → DEM_COLOR (blue)
 *                   Tie        → TIE_COLOR (purple)
 *
 * PROPS
 *   data         {Array}       — Pre-merged rows from EnsembleAnalysisSection.
 *                                Each row: { split, r, d, raceBlind, vra, rbTotal, vraTotal }
 *   enactedSplit {object|null} — { republican, democratic }
 *   yMax         {number}      — Shared y-axis ceiling (same as individual charts)
 *   className    {string}      — Optional height override
 */

import { useMemo } from 'react'
import { ResponsiveBar } from '@nivo/bar'
import {
    DEM_COLOR, REP_COLOR, TIE_COLOR,
    ENACTED_COLOR, AXIS_COLOR, LABEL_COLOR,
    COMPARE_RB_COLOR, COMPARE_VRA_COLOR,
} from '@/lib/partyColors'


/* ── Nivo theme ──────────────────────────────────────────────────────────── */
const NIVO_THEME = {
    background: 'transparent',
    axis: {
        ticks: { line: { stroke: AXIS_COLOR, strokeWidth: 1.5 }, text: { fill: LABEL_COLOR, fontWeight: 600, fontSize: 12 } },
        legend: { text: { fill: LABEL_COLOR, fontWeight: 700, fontSize: 13 } },
        domain: { line: { stroke: AXIS_COLOR, strokeWidth: 1.5 } },
    },
    grid: { line: { stroke: '#dce8f0', strokeWidth: 1, strokeDasharray: '3 4' } },
}


/* ── Background layer ────────────────────────────────────────────────────── */
function BgLayer({ innerWidth, innerHeight }) {
    return (
        <g>
            <defs>
                <linearGradient id="compareSplitBg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#eef6ff" />
                    <stop offset="100%" stopColor="#f8fafc" />
                </linearGradient>
            </defs>
            <rect width={innerWidth} height={innerHeight} fill="url(#compareSplitBg)" rx={6} />
            <rect width={innerWidth} height={innerHeight} fill="none" stroke="#b6cfdf" strokeWidth={1.5} rx={6} />
        </g>
    )
}


/* ── Enacted column highlight layer ─────────────────────────────────────── */
/*
 * Spans the full grouped-column (both bars) for the enacted split.
 */
function makeEnactedLayer(enactedLabel) {
    return function EnactedLayer({ bars, innerHeight }) {
        const splitBars = bars.filter(b => b.data.indexValue === enactedLabel)
        if (!splitBars.length) return null
        const leftX    = Math.min(...splitBars.map(b => b.x))
        const rightX   = Math.max(...splitBars.map(b => b.x + b.width))
        const cx       = (leftX + rightX) / 2
        const colWidth = rightX - leftX
        return (
            <g>
                <rect x={leftX - 3} y={0} width={colWidth + 6} height={innerHeight}
                    fill={ENACTED_COLOR} fillOpacity={0.10} rx={4} />
                <rect x={leftX - 3} y={0} width={colWidth + 6} height={innerHeight}
                    fill="none" stroke={ENACTED_COLOR} strokeWidth={2}
                    strokeDasharray="5 4" strokeOpacity={0.75} rx={4} />
                <text x={cx} y={-10} textAnchor="middle" fontSize={10} fontWeight={700} fill={ENACTED_COLOR}>
                    Enacted
                </text>
                <polygon points={`${cx - 4},${-3} ${cx + 4},${-3} ${cx},${3}`}
                    fill={ENACTED_COLOR} fillOpacity={0.85} />
            </g>
        )
    }
}


/* ── Party border overlay layer ─────────────────────────────────────────── */
/*
 * Drawn on top of 'bars'. Adds a red/blue stroke on each visible bar to
 * encode the majority party of that split outcome.
 * Uses bar.data.data.r / bar.data.data.d (Nivo custom-layer bar shape).
 * `?? 0` guards against missing values for extreme splits (0R-7D, 7R-0D).
 */
function PartyBorderLayer({ bars }) {
    return (
        <g>
            {bars
                .filter(b => b.height > 0)
                .map(b => {
                    const r = b.data.data.r ?? 0
                    const d = b.data.data.d ?? 0
                    const stroke = r > d ? REP_COLOR : d > r ? DEM_COLOR : TIE_COLOR
                    return (
                        <rect
                            key={b.key}
                            x={b.x} y={b.y}
                            width={b.width} height={b.height}
                            fill="none"
                            stroke={stroke}
                            strokeWidth={4}
                            rx={3}
                        />
                    )
                })}
        </g>
    )
}


/* ── Tooltip ─────────────────────────────────────────────────────────────── */
function CompareTooltip({ indexValue, id, value, data }) {
    const r = data.r ?? 0
    const d = data.d ?? 0
    const borderColor = r > d ? REP_COLOR : d > r ? DEM_COLOR : TIE_COLOR
    const fillColor   = id === 'vra' ? COMPARE_VRA_COLOR : COMPARE_RB_COLOR
    const label       = id === 'vra' ? 'VRA-Constrained' : 'Race-Blind'
    const total       = id === 'vra' ? data.vraTotal : data.rbTotal
    const pct         = total ? ((value / total) * 100).toFixed(1) : '0.0'
    return (
        <div style={{ background: 'white', border: `2px solid ${borderColor}`, borderRadius: 8, padding: '8px 12px', boxShadow: '0 4px 16px rgba(0,0,0,0.13)', fontSize: 12, minWidth: 185, lineHeight: 1.6 }}>
            <div style={{ color: borderColor, fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>{indexValue}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, background: fillColor, display: 'inline-block', flexShrink: 0, border: `1.5px solid ${borderColor}` }} />
                <span style={{ color: '#64748b', fontSize: 11, fontWeight: 600 }}>{label}</span>
            </div>
            <div style={{ color: '#475569' }}>Plans: <strong style={{ color: LABEL_COLOR }}>{value.toLocaleString()}</strong></div>
            <div style={{ color: '#475569' }}>Share: <strong style={{ color: LABEL_COLOR }}>{pct}%</strong></div>
        </div>
    )
}


/* ── Main component ──────────────────────────────────────────────────────── */
export default function EnsembleSplitCompareChart({ data, enactedSplit, yMax, className }) {
    if (!data?.length) return null

    const enactedLabel = enactedSplit
        ? `${enactedSplit.republican}R-${enactedSplit.democratic}D`
        : null

    const enactedLayer = useMemo(() => makeEnactedLayer(enactedLabel), [enactedLabel])

    /* Fill color by ensemble key only — border encodes party (via PartyBorderLayer) */
    const getBarColor = bar => bar.id === 'vra' ? COMPARE_VRA_COLOR : COMPARE_RB_COLOR

    return (
        <div className={`w-full rounded-xl border border-brand-muted/25 shadow-sm bg-white flex flex-col relative ${className ?? 'h-[380px]'}`}>

            {/* ── LEGEND — inline row above chart ────────────────────────── */}
            <div className="flex items-center gap-4 px-4 pt-2.5 pb-1 shrink-0 flex-wrap">
                <div className="flex items-center gap-1.5">
                    <span style={{ width: 12, height: 12, borderRadius: 2, background: COMPARE_RB_COLOR, display: 'inline-block', flexShrink: 0 }} />
                    <span style={{ fontSize: 11, color: LABEL_COLOR, fontWeight: 600 }}>Race-Blind</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <span style={{ width: 12, height: 12, borderRadius: 2, background: COMPARE_VRA_COLOR, display: 'inline-block', flexShrink: 0 }} />
                    <span style={{ fontSize: 11, color: LABEL_COLOR, fontWeight: 600 }}>VRA-Constrained</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <svg width="14" height="12">
                        <rect x="1" y="1" width="12" height="10" fill="transparent" stroke={DEM_COLOR} strokeWidth="2" rx="2" />
                    </svg>
                    <span style={{ fontSize: 11, color: LABEL_COLOR }}>D-Majority border</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <svg width="14" height="12">
                        <rect x="1" y="1" width="12" height="10" fill="transparent" stroke={REP_COLOR} strokeWidth="2" rx="2" />
                    </svg>
                    <span style={{ fontSize: 11, color: LABEL_COLOR }}>R-Majority border</span>
                </div>
                {enactedLabel && (
                    <div className="flex items-center gap-1.5">
                        <svg width="18" height="10">
                            <rect x="0" y="1" width="18" height="8" fill={ENACTED_COLOR} fillOpacity={0.12}
                                stroke={ENACTED_COLOR} strokeWidth={1.5} strokeDasharray="4 3" rx={2} />
                        </svg>
                        <span style={{ fontSize: 11, color: ENACTED_COLOR }}>Enacted ({enactedLabel})</span>
                    </div>
                )}
            </div>

            {/* ── GROUPED BAR CHART ─────────────────────────────────────── */}
            <div className="flex-1 min-h-0">
                <ResponsiveBar
                    data={data}
                    keys={['raceBlind', 'vra']}
                    indexBy="split"
                    groupMode="grouped"
                    margin={{ top: 16, right: 24, bottom: 64, left: 72 }}
                    padding={0.22}
                    innerPadding={6}
                    valueScale={{ type: 'linear', min: 0, max: yMax ?? 'auto' }}
                    indexScale={{ type: 'band', round: true }}
                    colors={getBarColor}
                    borderRadius={3}
                    borderWidth={0}
                    theme={NIVO_THEME}
                    layers={[BgLayer, 'grid', 'axes', enactedLayer, 'bars', PartyBorderLayer, 'markers']}
                    axisBottom={{ tickSize: 6, tickPadding: 5, legend: 'Republican – Democratic Split', legendOffset: 50, legendPosition: 'middle' }}
                    axisLeft={{ tickSize: 6, tickPadding: 5, legend: 'Number of Plans', legendOffset: -58, legendPosition: 'middle', format: v => v.toLocaleString() }}
                    enableLabel={false}
                    enableGridX={false}
                    tooltip={({ indexValue, id, value, data }) =>
                        <CompareTooltip indexValue={indexValue} id={id} value={value} data={data} />
                    }
                    isInteractive
                />
            </div>
        </div>
    )
}
