import * as d3 from 'd3'

const DEM_COLOR  = '#3b82f6'   // blue-500
const DEM_DARK   = '#1d4ed8'   // blue-700
const REP_COLOR  = '#ef4444'   // red-500
const REP_DARK   = '#b91c1c'   // red-700
const GRID_COLOR = '#e8eef2'
const AXIS_COLOR = '#94a3b8'
const LABEL_COLOR = '#64748b'
const THRESH_COLOR = '#94a3b8'

function getSeries(ginglesData, raceFilter) {
    const byRace = ginglesData?.seriesByRace ?? {}
    return byRace[raceFilter] ?? byRace.black ?? byRace.white ?? null
}

function buildPath(pts, xScale, yScale) {
    if (!pts?.length) return ''
    const lineGen = d3.line()
        .x(p => xScale(p.x))
        .y(p => yScale(p.y))
        .curve(d3.curveMonotoneX)
    return lineGen(pts) ?? ''
}

export default function GinglesScatterPlot({ ginglesData, raceFilter, selectedId, onDotClick }) {
    const series = getSeries(ginglesData, raceFilter)
    const points = series?.points ?? []

    const width  = 760
    const height = 400
    const margin = { top: 28, right: 28, bottom: 56, left: 64 }
    const innerW = width  - margin.left - margin.right
    const innerH = height - margin.top  - margin.bottom

    const xScale = d3.scaleLinear().domain([0, 1]).range([0, innerW])
    const yScale = d3.scaleLinear().domain([0, 1]).range([innerH, 0])

    const ticks  = [0, 0.25, 0.5, 0.75, 1]

    const demTrend = series?.democraticTrendline ?? series?.trendline ?? []
    const repTrend = series?.republicanTrendline ?? []
    const demPath  = buildPath(demTrend, xScale, yScale)
    const repPath  = buildPath(repTrend, xScale, yScale)

    const raceName = raceFilter
        ? raceFilter.charAt(0).toUpperCase() + raceFilter.slice(1)
        : 'Minority'
    const nLabel = `n = ${points.length} precincts`

    return (
        <div className="w-full rounded-xl border border-brand-muted/25 shadow-sm bg-white overflow-hidden">
            {points.length === 0 ? (
                <div className="h-[404px] flex items-center justify-center text-brand-muted/60 text-sm italic">
                    No Gingles scatter data available for this race.
                </div>
            ) : (
                <svg
                    viewBox={`0 0 ${width} ${height}`}
                    className="w-full"
                    style={{ height: '404px' }}
                    role="img"
                    aria-label={`Gingles scatter — ${raceName} VAP vs vote share`}
                >
                    <defs>
                        {/* Subtle plot-area gradient */}
                        <linearGradient id="plotBg" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%"   stopColor="#f0f7ff" />
                            <stop offset="100%" stopColor="#f8fafc" />
                        </linearGradient>
                        {/* Trendline glow filters */}
                        <filter id="demGlow">
                            <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
                            <feMerge>
                                <feMergeNode in="blur" />
                                <feMergeNode in="SourceGraphic" />
                            </feMerge>
                        </filter>
                        <filter id="repGlow">
                            <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
                            <feMerge>
                                <feMergeNode in="blur" />
                                <feMergeNode in="SourceGraphic" />
                            </feMerge>
                        </filter>
                    </defs>

                    <g transform={`translate(${margin.left},${margin.top})`}>

                        {/* ── Plot background ── */}
                        <rect width={innerW} height={innerH} fill="url(#plotBg)" rx="4" />
                        <rect width={innerW} height={innerH} fill="none" stroke="#c8d9e6" strokeWidth="1" rx="4" />

                        {/* ── Grid lines ── */}
                        {ticks.map(t => (
                            <g key={`grid-${t}`}>
                                <line
                                    x1={xScale(t)} y1={0}
                                    x2={xScale(t)} y2={innerH}
                                    stroke={GRID_COLOR}
                                    strokeWidth={t === 0.5 ? 1.5 : 1}
                                    strokeDasharray={t > 0 && t < 1 ? '5 4' : undefined}
                                />
                                <line
                                    x1={0}      y1={yScale(t)}
                                    x2={innerW} y2={yScale(t)}
                                    stroke={GRID_COLOR}
                                    strokeWidth={t === 0.5 ? 1.5 : 1}
                                    strokeDasharray={t > 0 && t < 1 ? '5 4' : undefined}
                                />
                            </g>
                        ))}

                        {/* ── 50 % majority threshold line (horizontal) ── */}
                        <line
                            x1={0}      y1={yScale(0.5)}
                            x2={innerW} y2={yScale(0.5)}
                            stroke={THRESH_COLOR}
                            strokeWidth="1.5"
                            strokeDasharray="8 5"
                        />
                        <text
                            x={innerW - 4}
                            y={yScale(0.5) - 5}
                            textAnchor="end"
                            fontSize="10"
                            fill={THRESH_COLOR}
                            fontWeight="600"
                            fontFamily="inherit"
                            letterSpacing="0.03em"
                        >
                            50 % Majority
                        </text>

                        {/* ── Trendline shadows (drawn wide + transparent behind) ── */}
                        {repPath && (
                            <path d={repPath} fill="none" stroke={REP_COLOR} strokeWidth="7"
                                strokeLinejoin="round" strokeLinecap="round" strokeOpacity="0.12" />
                        )}
                        {demPath && (
                            <path d={demPath} fill="none" stroke={DEM_COLOR} strokeWidth="7"
                                strokeLinejoin="round" strokeLinecap="round" strokeOpacity="0.12" />
                        )}

                        {/* ── Trendlines (crisp, on top of shadow) ── */}
                        {repPath && (
                            <path d={repPath} fill="none" stroke={REP_COLOR} strokeWidth="2.5"
                                strokeLinejoin="round" strokeLinecap="round" />
                        )}
                        {demPath && (
                            <path d={demPath} fill="none" stroke={DEM_COLOR} strokeWidth="2.5"
                                strokeLinejoin="round" strokeLinecap="round" />
                        )}

                        {/* ── Republican dots (y = 1 − dem) ── */}
                        {points.map(p => {
                            const isSel = p.id === selectedId
                            return (
                                <circle
                                    key={`rep-${p.id}`}
                                    cx={xScale(p.x)}
                                    cy={yScale(1 - p.y)}
                                    r={isSel ? 8 : 5.5}
                                    fill={REP_COLOR}
                                    fillOpacity={isSel ? 0.85 : 0.30}
                                    stroke={REP_DARK}
                                    strokeWidth={isSel ? 2 : 1}
                                    strokeOpacity={isSel ? 1 : 0.50}
                                    style={{ cursor: 'pointer' }}
                                    onClick={() => onDotClick?.(isSel ? null : p.id)}
                                >
                                    <title>{`${p.name} — ${raceName} VAP ${(p.x * 100).toFixed(1)}% | Rep ${((1 - p.y) * 100).toFixed(1)}%`}</title>
                                </circle>
                            )
                        })}

                        {/* ── Democratic dots ── */}
                        {points.map(p => {
                            const isSel = p.id === selectedId
                            return (
                                <circle
                                    key={`dem-${p.id}`}
                                    cx={xScale(p.x)}
                                    cy={yScale(p.y)}
                                    r={isSel ? 8 : 5.5}
                                    fill={DEM_COLOR}
                                    fillOpacity={isSel ? 0.85 : 0.30}
                                    stroke={DEM_DARK}
                                    strokeWidth={isSel ? 2 : 1}
                                    strokeOpacity={isSel ? 1 : 0.50}
                                    style={{ cursor: 'pointer' }}
                                    onClick={() => onDotClick?.(isSel ? null : p.id)}
                                >
                                    <title>{`${p.name} — ${raceName} VAP ${(p.x * 100).toFixed(1)}% | Dem ${(p.y * 100).toFixed(1)}%`}</title>
                                </circle>
                            )
                        })}

                        {/* ── X axis ── */}
                        <line x1={0} y1={innerH} x2={innerW} y2={innerH} stroke={AXIS_COLOR} strokeWidth="1" />
                        {ticks.map(t => (
                            <g key={`xtick-${t}`} transform={`translate(${xScale(t)},${innerH})`}>
                                <line y2="5" stroke={AXIS_COLOR} />
                                <text y="18" textAnchor="middle" fontSize="11" fill={LABEL_COLOR} fontFamily="inherit">
                                    {`${Math.round(t * 100)}%`}
                                </text>
                            </g>
                        ))}
                        <text x={innerW / 2} y={innerH + 46} textAnchor="middle" fontSize="12"
                            fill="#475569" fontWeight="600" fontFamily="inherit">
                            {raceName} Group VAP Share
                        </text>

                        {/* ── Y axis ── */}
                        <line x1={0} y1={0} x2={0} y2={innerH} stroke={AXIS_COLOR} strokeWidth="1" />
                        {ticks.map(t => (
                            <g key={`ytick-${t}`} transform={`translate(0,${yScale(t)})`}>
                                <line x2="-5" stroke={AXIS_COLOR} />
                                <text x="-10" textAnchor="end" dominantBaseline="middle"
                                    fontSize="11" fill={LABEL_COLOR} fontFamily="inherit">
                                    {`${Math.round(t * 100)}%`}
                                </text>
                            </g>
                        ))}
                        <text transform="rotate(-90)" x={-(innerH / 2)} y={-50}
                            textAnchor="middle" fontSize="12" fill="#475569" fontWeight="600" fontFamily="inherit">
                            Vote Share
                        </text>

                        {/* ── Legend ── */}
                        <g transform={`translate(${innerW - 152}, 12)`}>
                            <rect width="144" height="70" rx="7" fill="white"
                                stroke="#e2e8f0" strokeWidth="1"
                                style={{ filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.08))' }}
                            />
                            {/* Dem row */}
                            <line x1="12" y1="22" x2="28" y2="22" stroke={DEM_COLOR} strokeWidth="2.5" strokeLinecap="round" />
                            <circle cx="20" cy="22" r="4.5" fill={DEM_COLOR} fillOpacity="0.5" stroke={DEM_DARK} strokeWidth="1" />
                            <text x="36" y="26" fontSize="11" fill={DEM_DARK} fontWeight="600" fontFamily="inherit">Democratic</text>
                            {/* Rep row */}
                            <line x1="12" y1="46" x2="28" y2="46" stroke={REP_COLOR} strokeWidth="2.5" strokeLinecap="round" />
                            <circle cx="20" cy="46" r="4.5" fill={REP_COLOR} fillOpacity="0.5" stroke={REP_DARK} strokeWidth="1" />
                            <text x="36" y="50" fontSize="11" fill={REP_DARK} fontWeight="600" fontFamily="inherit">Republican</text>
                        </g>

                        {/* ── Sample size label ── */}
                        <text x={8} y={12} fontSize="10" fill={LABEL_COLOR} fontFamily="inherit" opacity="0.8">
                            {nLabel}
                        </text>

                    </g>
                </svg>
            )}
        </div>
    )
}
