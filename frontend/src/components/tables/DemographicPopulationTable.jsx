import { Badge } from '@/components/ui/badge'
import SurfacePanel from '@/components/ui/surface-panel'
import { cn } from '@/lib/utils'
import { FEASIBLE_CLS, NOT_FEASIBLE_CLS } from '@/lib/partyColors'
import { ROW_BORDER, ACTIVE_LABEL, INACTIVE_LABEL, rowBg } from '@/lib/tableStyles'

function groupKey(g) { return g.toLowerCase() }

export default function DemographicPopulationTable({ demographicGroups, raceFilter, setRaceFilter, fillHeight = false }) {
    if (!demographicGroups?.length) {
        return <p className="text-brand-muted/50 text-sm italic">No demographic data available.</p>
    }

    return (
        <SurfacePanel className={cn('overflow-auto border-brand-muted/20', fillHeight && 'h-full')}>
            <table className="w-full text-sm border-collapse">
                <thead>
                    <tr className="bg-brand-darkest text-brand-surface text-sm font-semibold">
                        <th className="px-4 py-3 text-left font-bold">Group</th>
                        <th className="px-4 py-3 text-right font-bold">VAP</th>
                        <th className="px-4 py-3 text-right font-bold">% VAP</th>
                        <th className="px-4 py-3 text-center font-bold">Opportunity</th>
                    </tr>
                </thead>
                <tbody>
                    {demographicGroups.map((row, i) => {
                        const key = groupKey(row.group)
                        const isActive = raceFilter === key

                        return (
                            <tr
                                key={row.group}
                                onClick={() => setRaceFilter(key)}
                                className={[
                                    ROW_BORDER, 'transition-colors cursor-pointer',
                                    rowBg(i, isActive),
                                ].join(' ')}
                            >
                                <td className="px-4 py-3">
                                    <span className={`font-bold text-sm ${isActive ? ACTIVE_LABEL : INACTIVE_LABEL}`}>
                                        {row.group}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-right tabular-nums text-brand-darkest font-medium">
                                    {row.vap?.toLocaleString() ?? '-'}
                                </td>
                                <td className="px-4 py-3 text-right">
                                    <span className={`tabular-nums font-bold text-base ${isActive ? ACTIVE_LABEL : INACTIVE_LABEL}`}>
                                        {row.vapPercentage != null ? `${(row.vapPercentage * 100).toFixed(1)}%` : '-'}
                                    </span>
                                </td>
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
