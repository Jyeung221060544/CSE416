import { Badge } from '@/components/ui/badge'
import SurfacePanel from '@/components/ui/surface-panel'
import { cn } from '@/lib/utils'

const ACTIVE = { bg: 'bg-brand-primary/15 ring-1 ring-inset ring-brand-primary/30', text: 'text-brand-primary', dot: 'bg-brand-primary' }
const HOVER = 'hover:bg-brand-primary/5'

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
                                    'border-t border-brand-muted/15 transition-colors cursor-pointer',
                                    isActive ? ACTIVE.bg : `${i % 2 === 0 ? 'bg-white' : 'bg-brand-surface/60'} ${HOVER}`,
                                ].join(' ')}
                            >
                                <td className="px-4 py-3">
                                    <span className={`font-bold text-sm ${isActive ? ACTIVE.text : 'text-brand-deep'}`}>
                                        {row.group}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-right tabular-nums text-brand-darkest font-medium">
                                    {row.vap?.toLocaleString() ?? '-'}
                                </td>
                                <td className="px-4 py-3 text-right">
                                    <span className={`tabular-nums font-bold text-base ${isActive ? ACTIVE.text : 'text-brand-deep'}`}>
                                        {row.vapPercentage != null ? `${(row.vapPercentage * 100).toFixed(1)}%` : '-'}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-center">
                                    {row.isFeasible
                                        ? <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-semibold px-2 py-0.5">Feasible</Badge>
                                        : <Badge className="bg-red-50 text-red-500 border-red-200 text-[10px] font-semibold px-2 py-0.5">Not Feasible</Badge>
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
