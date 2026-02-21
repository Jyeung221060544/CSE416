import * as d3 from 'd3'

const DEM_COLOR   = '#3b82f6'   // blue-500
const DEM_DARK    = '#1d4ed8'   // blue-700
const REP_COLOR   = '#ef4444'   // red-500
const REP_DARK    = '#b91c1c'   // red-700
const GRID_MINOR  = '#dce8f0'
const GRID_MAJOR  = '#b6cfdf'
const AXIS_COLOR  = '#64748b'
const LABEL_COLOR = '#334155'
const THRESH_COLOR = '#94a3b8'

function getSeries(ginglesData, raceFilter) {
    const byRace = ginglesData?.feasibleSeriesByRace ?? {}
    return byRace[raceFilter] ?? byRace.black ?? null
}

function buildPath(pts, xScale, yScale) {
    if (!pts?.length) return ''
    return d3.line()
        .x(p => xScale(p.x))
        .y(p => yScale(p.y))
        .curve(d3.curveMonotoneX)(pts) ?? ''
}

export default function GinglesScatterPlot({ ginglesData, raceFilter, selectedId, onDotClick, className }) {
    const series = getSeries(ginglesData, raceFilter)
    const points = series?.points ?? []

    const width  = 800
    const height = 480
    const margin = { top: 32, right: 36, bottom: 64, left: 72 }
    const innerW = width  - margin.left - margin.right
    const innerH = height - margin.top  - margin.bottom

    const xScale = d3.scaleLinear().domain([0, 1]).range([0, innerW])
    const yScale = d3.scaleLinear().domain([0, 1]).range([innerH, 0])

    const majorTicks = [0, 0.25, 0.5, 0.75, 1]
    const minorTicks = [0.1, 0.2, 0.3, 0.4, 0.6, 0.7, 0.8, 0.9]

    const demTrend = series?.democraticTrendline ?? []
    const repTrend = series?.republicanTrendline ?? []
    const demPath  = buildPath(demTrend, xScale, yScale)
    const repPath  = buildPath(repTrend, xScale, yScale)

    const raceName = raceFilter
        ? raceFilter.charAt(0).toUpperCase() + raceFilter.slice(1)
        : 'Minority'

    return (
        <div className={`w-full rounded-xl border border-brand-muted/25 shadow-sm bg-white overflow-hidden ${className ?? 'h-[404px]'}`}>
            {points.length === 0 ? (
                <div className="h-full flex items-center justify-center text-brand-muted/60 text-sm italic">
                    No Gingles scatter data available for this race.
                </div>
            ) : (
                <svg
                    viewBox={`0 0 ${width} ${height}`}
                    className="w-full h-full"
                    role="img"
                    aria-label={`Gingles scatter — ${raceName} VAP vs vote share`}
                >
                    <defs>
                        <linearGradient id="plotBg" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%"   stopColor="#eef6ff" />
                            <stop offset="100%" stopColor="#f8fafc" />
                        </linearGradient>
                        <clipPath id="plotClip">
                            <rect width={innerW} height={innerH} />
                        </clipPath>
                    </defs>

                    <g transform={`translate(${margin.left},${margin.top})`}>

                        {/* ── Plot background ── */}
                        <rect width={innerW} height={innerH} fill="url(#plotBg)" rx="6" />
                        <rect width={innerW} height={innerH} fill="none" stroke="#b6cfdf" strokeWidth="1.5" rx="6" />

                        {/* ── Minor grid lines ── */}
                        {minorTicks.map(t => (
                            <g key={`minor-${t}`}>
                                <line x1={xScale(t)} y1={0} x2={xScale(t)} y2={innerH}
                                    stroke={GRID_MINOR} strokeWidth="1" strokeDasharray="3 4" />
                                <line x1={0} y1={yScale(t)} x2={innerW} y2={yScale(t)}
                                    stroke={GRID_MINOR} strokeWidth="1" strokeDasharray="3 4" />
                            </g>
                        ))}

                        {/* ── Major grid lines ── */}
                        {majorTicks.filter(t => t > 0 && t < 1).map(t => (
                            <g key={`major-${t}`}>
                                <line x1={xScale(t)} y1={0} x2={xScale(t)} y2={innerH}
                                    stroke={GRID_MAJOR} strokeWidth="1.5" strokeDasharray="6 5" />
                                <line x1={0} y1={yScale(t)} x2={innerW} y2={yScale(t)}
                                    stroke={GRID_MAJOR} strokeWidth="1.5" strokeDasharray="6 5" />
                            </g>
                        ))}

                        {/* ── 50% majority threshold ── */}
                        <line x1={0} y1={yScale(0.5)} x2={innerW} y2={yScale(0.5)}
                            stroke={THRESH_COLOR} strokeWidth="2" strokeDasharray="10 6" />
                        <text x={innerW - 6} y={yScale(0.5) - 7}
                            textAnchor="end" fontSize="12" fill={THRESH_COLOR}
                            fontWeight="700" fontFamily="inherit" letterSpacing="0.02em">
                            50% Majority
                        </text>

                        {/* ── Trendline shadows ── */}
                        <g clipPath="url(#plotClip)">
                            {repPath && <path d={repPath} fill="none" stroke={REP_COLOR} strokeWidth="9"
                                strokeLinejoin="round" strokeLinecap="round" strokeOpacity="0.10" />}
                            {demPath && <path d={demPath} fill="none" stroke={DEM_COLOR} strokeWidth="9"
                                strokeLinejoin="round" strokeLinecap="round" strokeOpacity="0.10" />}

                            {/* ── Trendlines ── */}
                            {repPath && <path d={repPath} fill="none" stroke={REP_COLOR} strokeWidth="3"
                                strokeLinejoin="round" strokeLinecap="round" />}
                            {demPath && <path d={demPath} fill="none" stroke={DEM_COLOR} strokeWidth="3"
                                strokeLinejoin="round" strokeLinecap="round" />}

                            {/* ── Republican dots (y = 1 − dem) ── */}
                            {points.map(p => {
                                const isSel = p.id === selectedId
                                return (
                                    <circle key={`rep-${p.id}`}
                                        cx={xScale(p.x)} cy={yScale(1 - p.y)}
                                        r={isSel ? 9 : 6}
                                        fill={REP_COLOR} fillOpacity={isSel ? 0.90 : 0.32}
                                        stroke={REP_DARK} strokeWidth={isSel ? 2.5 : 1.2} strokeOpacity={isSel ? 1 : 0.55}
                                        style={{ cursor: 'pointer' }}
                                        onClick={() => onDotClick?.(isSel ? null : p.id)}
                                    >
                                        <title>{`${p.name} — ${raceName} VAP ${(p.x*100).toFixed(1)}% | Rep ${((1-p.y)*100).toFixed(1)}%`}</title>
                                    </circle>
                                )
                            })}

                            {/* ── Democratic dots ── */}
                            {points.map(p => {
                                const isSel = p.id === selectedId
                                return (
                                    <circle key={`dem-${p.id}`}
                                        cx={xScale(p.x)} cy={yScale(p.y)}
                                        r={isSel ? 9 : 6}
                                        fill={DEM_COLOR} fillOpacity={isSel ? 0.90 : 0.32}
                                        stroke={DEM_DARK} strokeWidth={isSel ? 2.5 : 1.2} strokeOpacity={isSel ? 1 : 0.55}
                                        style={{ cursor: 'pointer' }}
                                        onClick={() => onDotClick?.(isSel ? null : p.id)}
                                    >
                                        <title>{`${p.name} — ${raceName} VAP ${(p.x*100).toFixed(1)}% | Dem ${(p.y*100).toFixed(1)}%`}</title>
                                    </circle>
                                )
                            })}
                        </g>

                        {/* ── X axis ── */}
                        <line x1={0} y1={innerH} x2={innerW} y2={innerH} stroke={AXIS_COLOR} strokeWidth="1.5" />
                        {majorTicks.map(t => (
                            <g key={`xtick-${t}`} transform={`translate(${xScale(t)},${innerH})`}>
                                <line y2="7" stroke={AXIS_COLOR} strokeWidth="1.5" />
                                <text y="22" textAnchor="middle" fontSize="13" fill={LABEL_COLOR}
                                    fontWeight="600" fontFamily="inherit">
                                    {`${Math.round(t * 100)}%`}
                                </text>
                            </g>
                        ))}
                        <text x={innerW / 2} y={innerH + 52} textAnchor="middle" fontSize="14"
                            fill={LABEL_COLOR} fontWeight="700" fontFamily="inherit">
                            {raceName} Group VAP Share
                        </text>

                        {/* ── Y axis ── */}
                        <line x1={0} y1={0} x2={0} y2={innerH} stroke={AXIS_COLOR} strokeWidth="1.5" />
                        {majorTicks.map(t => (
                            <g key={`ytick-${t}`} transform={`translate(0,${yScale(t)})`}>
                                <line x2="-7" stroke={AXIS_COLOR} strokeWidth="1.5" />
                                <text x="-12" textAnchor="end" dominantBaseline="middle"
                                    fontSize="13" fill={LABEL_COLOR} fontWeight="600" fontFamily="inherit">
                                    {`${Math.round(t * 100)}%`}
                                </text>
                            </g>
                        ))}
                        <text transform="rotate(-90)" x={-(innerH / 2)} y={-56}
                            textAnchor="middle" fontSize="14" fill={LABEL_COLOR}
                            fontWeight="700" fontFamily="inherit">
                            Vote Share
                        </text>

                        {/* ── Legend ── */}
                        <g transform={`translate(${innerW - 160}, 14)`}>
                            <rect width="152" height="78" rx="8" fill="white"
                                stroke="#d1e3ef" strokeWidth="1.5"
                                style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.08))' }}
                            />
                            <line x1="12" y1="25" x2="30" y2="25" stroke={DEM_COLOR} strokeWidth="3" strokeLinecap="round" />
                            <circle cx="21" cy="25" r="5.5" fill={DEM_COLOR} fillOpacity="0.55" stroke={DEM_DARK} strokeWidth="1.5" />
                            <text x="38" y="30" fontSize="13" fill={DEM_DARK} fontWeight="700" fontFamily="inherit">Democratic</text>
                            <line x1="12" y1="52" x2="30" y2="52" stroke={REP_COLOR} strokeWidth="3" strokeLinecap="round" />
                            <circle cx="21" cy="52" r="5.5" fill={REP_COLOR} fillOpacity="0.55" stroke={REP_DARK} strokeWidth="1.5" />
                            <text x="38" y="57" fontSize="13" fill={REP_DARK} fontWeight="700" fontFamily="inherit">Republican</text>
                        </g>

                        {/* ── Sample size ── */}
                        <text x={8} y={14} fontSize="12" fill={LABEL_COLOR} fontFamily="inherit"
                            fontWeight="600" opacity="0.7">
                            n = {points.length} precincts
                        </text>

                    </g>
                </svg>
            )}
        </div>
    )
}
