import { Badge } from '@/components/ui/badge'
import SurfacePanel from '@/components/ui/surface-panel'
import { cn } from '@/lib/utils'
import { FEASIBLE_CLS, NOT_FEASIBLE_CLS } from '@/lib/partyColors'
import { ROW_BORDER, ACTIVE_LABEL, INACTIVE_LABEL, rowBg } from '@/lib/tableStyles'

/** @param {string} g @returns {string} */
function groupKey(g) { return g.toLowerCase() }

/**
 * VAP demographic table with clickable rows that update the global race filter.
 *
 * @param {{ demographicGroups: Array, raceFilter: string, setRaceFilter: Function, fillHeight?: boolean, readOnly?: boolean, districtSummary?: object, numDistricts?: number }} props
 */
export default function DemographicPopulationTable({ demographicGroups, raceFilter, setRaceFilter, fillHeight = false, readOnly = false, districtSummary = null, numDistricts = null }) {
    if (!demographicGroups?.length) {
        return <p className="text-brand-muted/50 text-sm italic">No demographic data available.</p>
    }

    const districts    = districtSummary?.districts ?? []
    const totalDist    = numDistricts ?? districts.length ?? 0
    const effectiveMap = {}
    districts.forEach(d => {
        const k = d.racialGroup?.toLowerCase()
        if (k) effectiveMap[k] = (effectiveMap[k] ?? 0) + 1
    })

    return (
        <SurfacePanel className={cn('overflow-y-auto overflow-x-hidden border-brand-muted/20', fillHeight && 'h-full')}>
            <table className="w-full text-sm border-collapse">

                <thead>
                    <tr className="bg-brand-darkest text-brand-surface text-sm font-semibold">
                        <th className="px-4 py-3 text-center font-bold">Group</th>
                        <th className="px-4 py-3 text-center font-bold">VAP</th>
                        <th className="px-4 py-3 text-center font-bold">% VAP</th>
                        {totalDist > 0 && <th className="px-4 py-3 text-center font-bold">Rough Proportionality</th>}
                        <th className="px-4 py-3 text-center font-bold">Feasibility</th>
                    </tr>
                </thead>

                <tbody>
                    {demographicGroups.map((row, i) => {
                        const key      = groupKey(row.group)
                        const isActive = raceFilter === key

                        const effCount  = effectiveMap[key] ?? 0
                        const distShare = totalDist > 0 ? effCount / totalDist : null
                        const ratio     = (distShare != null && row.vapPercentage > 0)
                            ? distShare / row.vapPercentage
                            : null
                        const ratioColor = ratio == null ? 'text-brand-muted/40'
                            : ratio >= 0.9  ? 'text-green-600'
                            : ratio >= 0.5  ? 'text-amber-600'
                            :                 'text-red-600'

                        return (
                            <tr
                                key={row.group}
                                onClick={readOnly ? undefined : () => setRaceFilter(key)}
                                className={[
                                    ROW_BORDER, 'transition-colors',
                                    !readOnly && 'cursor-pointer',
                                    rowBg(i, !readOnly && isActive),
                                ].join(' ')}
                            >
                                <td className="px-4 py-3">
                                    <span className={`font-bold text-sm ${!readOnly && isActive ? ACTIVE_LABEL : INACTIVE_LABEL}`}>
                                        {row.group.charAt(0).toUpperCase() + row.group.slice(1)}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-right tabular-nums text-brand-darkest font-medium">
                                    {row.vap?.toLocaleString() ?? '-'}
                                </td>
                                <td className="px-4 py-3 text-right">
                                    <span className={`tabular-nums font-medium text-sm ${!readOnly && isActive ? ACTIVE_LABEL : INACTIVE_LABEL}`}>
                                        {row.vapPercentage != null ? `${(row.vapPercentage * 100).toFixed(1)}%` : '-'}
                                    </span>
                                </td>
                                {totalDist > 0 && (
                                    <td className="px-4 py-3 text-center">
                                        <span className="tabular-nums font-semibold text-brand-darkest">
                                            {effCount}/{totalDist}
                                        </span>
                                    </td>
                                )}
                                <td className="px-4 py-3 text-center">
                                    {row.isFeasible
                                        ? <Badge className={FEASIBLE_CLS}>Feasible</Badge>
                                        : <Badge className={NOT_FEASIBLE_CLS}>Not Feasible</Badge>
                                    }
                                </td>
                            </tr>
                        )
                    })}
                </tbody>
            </table>
        </SurfacePanel>
    )
}
