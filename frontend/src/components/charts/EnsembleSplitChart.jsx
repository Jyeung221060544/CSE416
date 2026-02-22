import { useMemo } from 'react'
import { ResponsiveBar } from '@nivo/bar'

const DEM_COLOR     = '#3b82f6'
const REP_COLOR     = '#ef4444'
const TIE_COLOR     = '#a855f7'
const ENACTED_COLOR = '#f59e0b'
const AXIS_COLOR    = '#64748b'
const LABEL_COLOR   = '#334155'

// ── Nivo theme ──────────────────────────────────────────────────────────────
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

// ── Background layer factory (unique gradient ID per chart instance) ─────────
function makeBgLayer(chartId) {
    return function BgLayer({ innerWidth, innerHeight }) {
        const gradId = `splitBarBg_${chartId}`
        return (
            <g>
                <defs>
                    <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%"   stopColor="#eef6ff" />
                        <stop offset="100%" stopColor="#f8fafc" />
                    </linearGradient>
                </defs>
                <rect width={innerWidth} height={innerHeight} fill={`url(#${gradId})`} rx={6} />
                <rect width={innerWidth} height={innerHeight} fill="none" stroke="#b6cfdf" strokeWidth={1.5} rx={6} />
            </g>
        )
    }
}

// ── Enacted-plan column highlight layer ─────────────────────────────────────
function makeEnactedLayer(enactedLabel) {
    return function EnactedLayer({ bars, innerHeight }) {
        const bar = bars.find(b => b.data.indexValue === enactedLabel)
        if (!bar) return null
        const cx = bar.x + bar.width / 2
        return (
            <g>
                {/* Amber column fill */}
                <rect
                    x={bar.x - 3} y={0}
                    width={bar.width + 6} height={innerHeight}
                    fill={ENACTED_COLOR} fillOpacity={0.10} rx={4}
                />
                {/* Dashed border */}
                <rect
                    x={bar.x - 3} y={0}
                    width={bar.width + 6} height={innerHeight}
                    fill="none"
                    stroke={ENACTED_COLOR} strokeWidth={2}
                    strokeDasharray="5 4" strokeOpacity={0.75} rx={4}
                />
                {/* "Enacted" label above the plot area */}
                <text
                    x={cx} y={-10}
                    textAnchor="middle"
                    fontSize={10} fontWeight={700}
                    fill={ENACTED_COLOR}
                >
                    Enacted
                </text>
                {/* Small down-pointing triangle pointer */}
                <polygon
                    points={`${cx - 4},${-3} ${cx + 4},${-3} ${cx},${3}`}
                    fill={ENACTED_COLOR} fillOpacity={0.85}
                />
            </g>
        )
    }
}

// ── Tooltip ─────────────────────────────────────────────────────────────────
function SplitTooltip({ indexValue, value, data }) {
    const r = data.r ?? 0
    const d = data.d ?? 0
    const isRMaj = r > d
    const isDMaj = d > r
    const color  = isRMaj ? REP_COLOR : isDMaj ? DEM_COLOR : TIE_COLOR
    const pct    = ((value / data.total) * 100).toFixed(1)
    return (
        <div style={{
            background: 'white',
            border: `2px solid ${color}`,
            borderRadius: 8,
            padding: '8px 12px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.13)',
            fontSize: 12,
            minWidth: 170,
            lineHeight: 1.6,
        }}>
            <div style={{ color, fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>
                {indexValue}
            </div>
            <div style={{ color: '#475569' }}>
                Plans: <strong style={{ color: LABEL_COLOR }}>{value.toLocaleString()}</strong>
            </div>
            <div style={{ color: '#475569' }}>
                Share: <strong style={{ color: LABEL_COLOR }}>{pct}%</strong>
            </div>
        </div>
    )
}

// ── Main component ───────────────────────────────────────────────────────────
/**
 * Props:
 *  ensembleData  – one entry from splits.ensembles  { ensembleType, splits }
 *  enactedSplit  – { republican, democratic }
 *  chartId       – unique string to prevent SVG gradient ID collisions
 *  className     – optional height class
 */
export default function EnsembleSplitChart({ ensembleData, enactedSplit, yMax, chartId = 'default', className }) {
    if (!ensembleData) return null

    const { splits } = ensembleData
    const total = splits.reduce((s, r) => s + r.frequency, 0)

    // Always include the enacted split row even if frequency === 0
    const nivoData = useMemo(() => {
        const enactedR = enactedSplit?.republican
        return splits
            .filter(s => s.frequency > 0 || s.republican === enactedR)
            .map(s => ({
                split: `${s.republican}R-${s.democratic}D`,
                plans: s.frequency,
                r:     s.republican,
                d:     s.democratic,
                total,
            }))
    }, [splits, enactedSplit, total])

    const enactedLabel = enactedSplit
        ? `${enactedSplit.republican}R-${enactedSplit.democratic}D`
        : null

    const bgLayer      = useMemo(() => makeBgLayer(chartId), [chartId])
    const enactedLayer = useMemo(() => makeEnactedLayer(enactedLabel), [enactedLabel])

    const getBarColor = bar => {
        const r = bar.data.r ?? 0
        const d = bar.data.d ?? 0
        if (r > d) return REP_COLOR
        if (d > r) return DEM_COLOR
        return TIE_COLOR
    }

    return (
        <div className={`w-full rounded-xl border border-brand-muted/25 shadow-sm bg-white flex flex-col ${className ?? 'h-[360px]'}`}>

            {/* Legend row */}
            <div className="flex flex-wrap items-center gap-4 px-4 pt-3 pb-1 flex-shrink-0">
                <div className="flex items-center gap-1.5">
                    <span style={{ width: 12, height: 12, borderRadius: 3, background: DEM_COLOR, display: 'inline-block', flexShrink: 0 }} />
                    <span style={{ fontSize: 12, fontWeight: 600, color: LABEL_COLOR }}>D-Majority</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <span style={{ width: 12, height: 12, borderRadius: 3, background: REP_COLOR, display: 'inline-block', flexShrink: 0 }} />
                    <span style={{ fontSize: 12, fontWeight: 600, color: LABEL_COLOR }}>R-Majority</span>
                </div>
                {enactedLabel && (
                    <div className="flex items-center gap-1.5">
                        <svg width="22" height="12">
                            <rect x="0" y="1" width="22" height="10"
                                fill={ENACTED_COLOR} fillOpacity={0.12}
                                stroke={ENACTED_COLOR} strokeWidth={1.5} strokeDasharray="4 3" rx={2} />
                        </svg>
                        <span style={{ fontSize: 12, fontWeight: 600, color: ENACTED_COLOR }}>
                            Enacted ({enactedLabel})
                        </span>
                    </div>
                )}
                <span className="ml-auto text-[11px] font-semibold text-slate-500 opacity-70 select-none">
                    n = {total.toLocaleString()} plans
                </span>
            </div>

            {/* Chart */}
            <div className="flex-1 min-h-0">
                <ResponsiveBar
                    data={nivoData}
                    keys={['plans']}
                    indexBy="split"
                    margin={{ top: 28, right: 24, bottom: 64, left: 72 }}

                    padding={0.28}
                    valueScale={{ type: 'linear', min: 0, max: yMax ?? 'auto' }}
                    indexScale={{ type: 'band', round: true }}

                    colors={getBarColor}
                    borderRadius={4}
                    borderWidth={0}

                    theme={NIVO_THEME}

                    layers={[
                        bgLayer,
                        'grid',
                        'axes',
                        enactedLayer,
                        'bars',
                        'markers',
                        'legends',
                    ]}

                    axisBottom={{
                        tickSize: 6,
                        tickPadding: 5,
                        legend: 'Republican – Democratic Split',
                        legendOffset: 50,
                        legendPosition: 'middle',
                    }}
                    axisLeft={{
                        tickSize: 6,
                        tickPadding: 5,
                        legend: 'Number of Plans',
                        legendOffset: -58,
                        legendPosition: 'middle',
                        format: v => v.toLocaleString(),
                    }}

                    enableLabel={false}
                    enableGridX={false}

                    tooltip={({ indexValue, value, data }) => (
                        <SplitTooltip indexValue={indexValue} value={value} data={data} />
                    )}
                    isInteractive
                />
            </div>
        </div>
    )
}
