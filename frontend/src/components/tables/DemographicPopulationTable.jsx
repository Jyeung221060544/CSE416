import { Badge } from '@/components/ui/badge'
import SurfacePanel from '@/components/ui/surface-panel'
import { cn } from '@/lib/utils'

const ACTIVE = { bg: 'bg-teal-50', text: 'text-teal-700', dot: 'bg-teal-500' }
const HOVER = 'hover:bg-teal-50/40'

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
                                    isActive ? ACTIVE.bg : `${i % 2 === 0 ? 'bg-white' : 'bg-brand-muted/[0.03]'} ${HOVER}`,
                                ].join(' ')}
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
                                        : <span className="text-brand-muted/40 text-xs italic">-</span>
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
