import { Separator } from '@/components/ui/separator'
import { Badge }     from '@/components/ui/badge'
import useAppStore   from '../../store/useAppStore'
import DemographicHeatmap from '../maps/DemographicHeatmap'

// ── Shared sub-components ──────────────────────────────────────────────

function SectionHeader({ title }) {
    return (
        <div className="flex items-center gap-3 mb-4">
            <h3 className="text-base font-bold uppercase tracking-widest text-brand-deep shrink-0">{title}</h3>
            <Separator className="flex-1 bg-brand-muted/25" />
        </div>
    )
}

// ── Demographic table ──────────────────────────────────────────────────

// Consistent teal palette for all highlighted rows
const ACTIVE  = { bg: 'bg-teal-50',   text: 'text-teal-700',  dot: 'bg-teal-500'  }
const HOVER   = 'hover:bg-teal-50/40'

function groupKey(g) { return g.toLowerCase() }

function DemographicTable({ demographicGroups, raceFilter, setRaceFilter }) {
    if (!demographicGroups?.length)
        return <p className="text-brand-muted/50 text-sm italic">No demographic data available.</p>

    return (
        <div className="overflow-x-auto rounded-xl border border-brand-muted/20 shadow-sm">
            <table className="w-full text-sm border-collapse">
                <thead>
                    <tr className="bg-brand-muted/10 text-brand-deep text-[11px] uppercase tracking-widest">
                        <th className="px-4 py-3 text-left font-bold">Group</th>
                        <th className="px-4 py-3 text-right font-bold">VAP</th>
                        <th className="px-4 py-3 text-right font-bold">% VAP</th>
                        <th className="px-4 py-3 text-center font-bold">Opportunity</th>
                    </tr>
                </thead>
                <tbody>
                    {demographicGroups.map((row, i) => {
                        const key      = groupKey(row.group)
                        const isActive = raceFilter === key

                        return (
                            <tr
                                key={row.group}
                                onClick={() => setRaceFilter(key)}
                                className={`
                                    border-t border-brand-muted/15 transition-colors cursor-pointer
                                    ${isActive
                                        ? ACTIVE.bg
                                        : `${i % 2 === 0 ? 'bg-white' : 'bg-brand-muted/[0.03]'} ${HOVER}`
                                    }
                                `}
                            >
                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-2">
                                        <span className={`w-2 h-2 rounded-full shrink-0 ${isActive ? ACTIVE.dot : 'bg-brand-muted/30'}`} />
                                        <span className={`font-semibold ${isActive ? ACTIVE.text : 'text-brand-darkest'}`}>
                                            {row.group}
                                        </span>
                                    </div>
                                </td>
                                <td className="px-4 py-3 text-right tabular-nums text-brand-darkest font-medium">
                                    {row.vap?.toLocaleString() ?? '—'}
                                </td>
                                <td className="px-4 py-3 text-right">
                                    <span className={`tabular-nums font-bold text-base ${isActive ? ACTIVE.text : 'text-brand-deep'}`}>
                                        {row.vapPercentage != null ? `${(row.vapPercentage * 100).toFixed(1)}%` : '—'}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-center">
                                    {row.isFeasible
                                        ? <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-semibold px-2 py-0.5">Feasible</Badge>
                                        : <span className="text-brand-muted/40 text-xs italic">—</span>
                                    }
                                </td>
                            </tr>
                        )
                    })}
                </tbody>
            </table>
            <p className="px-4 py-2 text-[10px] text-brand-muted/50 italic">
                Click a row to highlight that group.
            </p>
        </div>
    )
}

// ── Heatmap legend — always 5 per row ─────────────────────────────────

function HeatmapLegend({ bins }) {
    if (!bins?.length) return null

    return (
        <div className="p-3 rounded-xl border border-brand-muted/20 bg-white shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-widest text-brand-deep mb-2">
                Legend — % Minority VAP per unit
            </p>
            {/* 5 per row: row 1 = bins 1–5, row 2 = bins 6–10 */}
            <div className="grid grid-cols-5 gap-x-3 gap-y-2">
                {bins.map(bin => (
                    <div key={bin.binId} className="flex items-center gap-1.5">
                        <span
                            className="w-4 h-4 rounded-sm border border-black/15 shrink-0"
                            style={{ backgroundColor: bin.color }}
                        />
                        <span className="text-xs font-semibold text-brand-darkest tabular-nums">
                            {bin.rangeMin}–{bin.rangeMax}%
                        </span>
                    </div>
                ))}
            </div>
        </div>
    )
}

// ── Main section ───────────────────────────────────────────────────────

export default function DemographicSection({ data, stateId }) {
    const raceFilter        = useAppStore(s => s.raceFilter)
    const setRaceFilter     = useAppStore(s => s.setRaceFilter)
    const granularityFilter = useAppStore(s => s.granularityFilter)

    const s = data?.stateSummary
    const demographicGroups = s?.demographicGroups ?? []

    // Pick heatmap data based on granularity — server already assigned binIds
    const heatmapData = granularityFilter === 'census_block'
        ? (data?.heatmapCensus   ?? null)
        : (data?.heatmapPrecinct ?? null)

    const granularityLabel = granularityFilter === 'census_block' ? 'Census Block' : 'Precinct'

    return (
        <section id="demographic" className="p-4 sm:p-6 lg:p-8 border-b border-brand-muted/30">

            {/* ── Header ────────────────────────────────────────────── */}
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-brand-darkest tracking-tight">
                    Demographic Analysis
                </h2>
                {s?.stateName && (
                    <span className="text-xs text-brand-muted/60 font-medium tracking-wide hidden sm:block">
                        {s.stateName}
                    </span>
                )}
            </div>

            {/* ── Two-panel layout ──────────────────────────────────── */}
            <div className="grid grid-cols-1 xl:grid-cols-[38fr_62fr] gap-6">

                {/* ── LEFT: Table ────────────────────────────────────── */}
                <div className="flex flex-col gap-4">
                    <SectionHeader title="Population by Group" />

                    <DemographicTable
                        demographicGroups={demographicGroups}
                        raceFilter={raceFilter}
                        setRaceFilter={setRaceFilter}
                    />

                    <p className="text-xs text-brand-muted/60 leading-relaxed">
                        <span className="font-semibold text-brand-deep">Opportunity district:</span> Feasible
                        indicates the group's VAP% may support a majority-minority district under the Gingles
                        preconditions.
                    </p>
                </div>

                {/* ── RIGHT: Heatmap ─────────────────────────────────── */}
                <div className="flex flex-col gap-3">
                    <SectionHeader title="Demographic Heat Map" />

                    {/* Active filter labels — controlled by sidebar */}
                    <div className="flex items-center gap-2 text-xs text-brand-muted/70">
                        <span className="font-semibold text-brand-deep">Showing:</span>
                        <span className="px-2 py-0.5 rounded-md bg-teal-500/10 text-teal-700 font-semibold capitalize">
                            {raceFilter}
                        </span>
                        <span className="font-semibold text-brand-deep ml-2">Granularity:</span>
                        <span className="px-2 py-0.5 rounded-md bg-brand-muted/15 text-brand-deep font-semibold">
                            {granularityLabel}
                        </span>
                    </div>

                    {/* Legend above map — 5 per row */}
                    {heatmapData
                        ? <HeatmapLegend bins={heatmapData.bins} />
                        : stateId && (
                            <p className="text-xs text-brand-muted/60 italic">
                                Heatmap data not yet available for this state.
                            </p>
                        )
                    }

                    {/* Map */}
                    <div className="rounded-xl overflow-hidden border border-brand-muted/25 shadow-sm h-[340px] sm:h-[400px] xl:h-[420px]">
                        <DemographicHeatmap
                            stateId={stateId}
                            granularity={granularityFilter}
                            heatmapData={heatmapData}
                            raceFilter={raceFilter}
                        />
                    </div>
                </div>
            </div>

        </section>
    )
}
