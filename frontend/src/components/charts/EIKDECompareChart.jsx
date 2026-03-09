/**
 * EIKDECompareChart.jsx — Polarization KDE for two racial groups (Democratic candidate).
 *
 * Renders a single KDE curve showing the probability density of the DIFFERENCE in
 * vote-share support between two racial groups for the Democratic candidate only.
 *
 * X-axis: (race1 − race2) support, from −100% to +100%.
 * Zero-line marks no difference.
 *
 * Shows an empty-state prompt when fewer than 2 races are selected.
 *
 * PROPS
 *   pairData  {object|null} — Matching racePair from eiCompare.racePairs.
 *   races     {string[]}    — The two selected race keys (may be 0, 1, or 2 items).
 *   className {string}      — Optional height class.
 */

import { useMemo }        from 'react'
import { ResponsiveLine } from '@nivo/line'
import { DEM_COLOR, RACE_LABELS, AXIS_COLOR, LABEL_COLOR } from '@/lib/partyColors'


/* ── Step 0: Nivo theme ──────────────────────────────────────────────────── */
const NIVO_THEME = {
    background: 'transparent',
    axis: {
        ticks:  { line: { stroke: AXIS_COLOR, strokeWidth: 1.5 }, text: { fill: LABEL_COLOR, fontWeight: 600, fontSize: 11 } },
        legend: { text: { fill: LABEL_COLOR, fontWeight: 700, fontSize: 12 } },
        domain: { line: { stroke: AXIS_COLOR, strokeWidth: 1.5 } },
    },
    grid: { line: { stroke: '#dce8f0', strokeWidth: 1, strokeDasharray: '3 4' } },
}


/* ── Step 1: Background layer ────────────────────────────────────────────── */
function BgLayer({ innerWidth, innerHeight }) {
    return (
        <g>
            <defs>
                <linearGradient id="eiCompareBg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor="#eef6ff" />
                    <stop offset="100%" stopColor="#f8fafc" />
                </linearGradient>
            </defs>
            <rect width={innerWidth} height={innerHeight} fill="url(#eiCompareBg)" rx={6} />
            <rect width={innerWidth} height={innerHeight} fill="none" stroke="#b6cfdf" strokeWidth={1.5} rx={6} />
        </g>
    )
}


/* ── Zero-line layer ─────────────────────────────────────────────────────── */
function ZeroLine({ xScale, innerHeight }) {
    const x0 = xScale(0)
    return (
        <line
            x1={x0} y1={0} x2={x0} y2={innerHeight}
            stroke="#94a3b8" strokeWidth={1.5} strokeOpacity={0.55}
        />
    )
}


/* ── Slice tooltip ───────────────────────────────────────────────────────── */
function makeSliceTooltip(r0Label, r1Label) {
    return function CompareSliceTooltip({ slice }) {
        const x  = slice.points[0]?.data.x
        const pt = slice.points[0]
        if (x == null || !pt) return null
        return (
            <div style={{ background: 'white', border: `2px solid ${DEM_COLOR}`, borderRadius: 8, padding: '8px 12px', boxShadow: '0 4px 16px rgba(0,0,0,0.10)', fontSize: 12, lineHeight: 1.6 }}>
                <div style={{ color: '#475569', marginBottom: 2 }}>
                    {r0Label} | {r1Label}: <strong style={{ color: LABEL_COLOR }}>{(x * 100).toFixed(1)}%</strong>
                </div>
                <div style={{ color: '#475569' }}>
                    Density: <strong style={{ color: LABEL_COLOR }}>{Number(pt.data.y).toFixed(2)}</strong>
                </div>
            </div>
        )
    }
}


/* ── KDE fold — convert signed [-1,1] difference to absolute [0,1] ────────── */
function foldKdePoints(kdePoints) {
    if (!kdePoints?.length) return []
    function interp(x) {
        for (let i = 0; i < kdePoints.length - 1; i++) {
            const p0 = kdePoints[i], p1 = kdePoints[i + 1]
            if (p0.x <= x && x <= p1.x)
                return p0.y + (p1.y - p0.y) * (x - p0.x) / (p1.x - p0.x)
        }
        return 0
    }
    const xs = Array.from(new Set(kdePoints.map(p => Math.abs(p.x)))).sort((a, b) => a - b)
    return xs.map(x => ({ x, y: interp(x) + interp(-x) }))
}


/* ── Threshold shading layer factory ────────────────────────────────────── */
/**
 * Returns a Nivo custom layer that shades the KDE tail beyond `threshold`
 * (in the direction of the peak) and annotates the probability.
 *
 * peakX >= 0 → shade x > threshold (race0 is more Dem-favoring)
 * peakX <  0 → shade x < -threshold (race1 is more Dem-favoring, curve peaks left)
 */
/* kdePoints are the already-folded [0,1] points */
function makeThresholdLayer(kdePoints, threshold) {
    /* Trapezoidal integration over [threshold, 1] */
    let probGT = 0
    for (let i = 0; i < kdePoints.length - 1; i++) {
        const p0 = kdePoints[i], p1 = kdePoints[i + 1]
        const sLo = Math.max(p0.x, threshold), sHi = Math.min(p1.x, 1)
        if (sHi <= sLo) continue
        const span = p1.x - p0.x
        const y0 = p0.y + (p1.y - p0.y) * (sLo - p0.x) / span
        const y1 = p0.y + (p1.y - p0.y) * (sHi - p0.x) / span
        probGT += (sHi - sLo) * (y0 + y1) / 2
    }

    /* Polygon points for the shaded tail */
    const shadePts = []
    for (let i = 0; i < kdePoints.length - 1; i++) {
        const p0 = kdePoints[i], p1 = kdePoints[i + 1]
        const span = p1.x - p0.x
        if (p0.x < threshold && p1.x > threshold)
            shadePts.push({ x: threshold, y: p0.y + (p1.y - p0.y) * (threshold - p0.x) / span })
        if (p0.x >= threshold) shadePts.push(p0)
    }
    const last = kdePoints[kdePoints.length - 1]
    if (last.x >= threshold) shadePts.push(last)

    const label = `Prob(|diff| > ${Math.round(threshold * 100)}%) = ${(probGT * 100).toFixed(1)}%`

    return function ThresholdLayer({ xScale, yScale }) {
        if (shadePts.length < 2) return null
        const baseY = yScale(0)
        const pathD = [
            `M ${xScale(shadePts[0].x)} ${baseY}`,
            ...shadePts.map(p => `L ${xScale(p.x)} ${yScale(p.y)}`),
            `L ${xScale(shadePts[shadePts.length - 1].x)} ${baseY}`,
            'Z',
        ].join(' ')
        return (
            <g>
                <path d={pathD} fill="rgba(59,130,246,0.18)" />
                <line
                    x1={xScale(threshold)} y1={0}
                    x2={xScale(threshold)} y2={baseY}
                    stroke="#64748b" strokeWidth={1.5} strokeDasharray="4 3"
                />
                <text x={xScale((threshold + 1) / 2)} y={baseY * 0.22} textAnchor="middle" fontSize={11} fontWeight={700} fill="#1e3a5f">
                    {label}
                </text>
            </g>
        )
    }
}


/* ── Main component ──────────────────────────────────────────────────────── */
export default function EIKDECompareChart({ pairData, races, threshold = 0.4, className }) {

    /* ── Empty state: fewer than 2 races selected ───────────────────────── */
    if (!races || races.length < 2) {
        return (
            <div className={`w-full rounded-xl border border-brand-muted/25 shadow-sm bg-white flex items-center justify-center text-brand-muted/50 text-sm italic ${className ?? 'h-[380px]'}`}>
                Please select 2 race groups to compare.
            </div>
        )
    }

    /* ── No data for pair ───────────────────────────────────────────────── */
    if (!pairData) {
        return (
            <div className={`w-full rounded-xl border border-brand-muted/25 shadow-sm bg-white flex items-center justify-center text-brand-muted/50 text-sm italic ${className ?? 'h-[380px]'}`}>
                No comparison data available for the selected pair.
            </div>
        )
    }

    const demCandidate = useMemo(
        () => pairData.candidates.find(c => c.party === 'Democratic') ?? null,
        [pairData]
    )

    /* Fold signed [-1,1] KDE to absolute [0,1] — polarization magnitude only */
    const foldedPts = useMemo(
        () => foldKdePoints(demCandidate?.kdePoints ?? []),
        [demCandidate]
    )

    const nivoData = useMemo(
        () => [{ id: 'kde', data: foldedPts.map(p => ({ x: p.x, y: p.y })) }],
        [foldedPts]
    )

    const yMax = useMemo(() => {
        const max = foldedPts.reduce((m, p) => p.y > m ? p.y : m, 0)
        return max ? Math.ceil(max * 1.15 * 10) / 10 : 4
    }, [foldedPts])

    const sliceTooltip = useMemo(
        () => makeSliceTooltip(
            RACE_LABELS[pairData.races[0]] ?? pairData.races[0],
            RACE_LABELS[pairData.races[1]] ?? pairData.races[1],
        ),
        [pairData]
    )

    if (!demCandidate) return null

    const r0Label = RACE_LABELS[pairData.races[0]] ?? pairData.races[0]
    const r1Label = RACE_LABELS[pairData.races[1]] ?? pairData.races[1]
    const thresholdLayer = makeThresholdLayer(foldedPts, threshold)

    /* ── Render ─────────────────────────────────────────────────────────── */
    return (
        <div className={`w-full rounded-xl border border-brand-muted/25 shadow-sm bg-white flex flex-col ${className ?? 'h-[380px]'}`}>

            {/* ── CHART ────────────────────────────────────────────────── */}
            <div className="flex-1 min-h-0">
                <ResponsiveLine
                    data={nivoData}
                    margin={{ top: 16, right: 28, bottom: 64, left: 68 }}
                    xScale={{ type: 'linear', min: 0, max: 1 }}
                    yScale={{ type: 'linear', min: 0, max: yMax, stacked: false }}
                    curve="monotoneX"
                    enableArea
                    areaOpacity={0.18}
                    colors={[DEM_COLOR]}
                    lineWidth={2.5}
                    enablePoints={false}
                    theme={NIVO_THEME}
                    layers={[BgLayer, 'grid', 'axes', 'areas', thresholdLayer, 'lines', 'crosshair', 'slices']}
                    axisBottom={{
                        tickSize: 5, tickPadding: 5,
                        format: v => `${Math.round(v * 100)}%`,
                        tickValues: [0, 0.25, 0.5, 0.75, 1],
                        legend: `|${r0Label} \u2212 ${r1Label}|  Dem Support Difference`,
                        legendOffset: 50, legendPosition: 'middle',
                    }}
                    axisLeft={{
                        tickSize: 5, tickPadding: 5,
                        format: v => v.toFixed(1),
                        tickValues: 4,
                        legend: 'Probability Density',
                        legendOffset: -56, legendPosition: 'middle',
                    }}
                    gridXValues={[-1, -0.75, -0.5, -0.25, 0, 0.25, 0.5, 0.75, 1]}
                    enableSlices="x"
                    sliceTooltip={sliceTooltip}
                    isInteractive
                />
            </div>

        </div>
    )
}
