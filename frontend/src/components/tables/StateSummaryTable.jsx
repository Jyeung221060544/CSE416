import { Badge } from '@/components/ui/badge'

export default function StateSummaryTable({ stateSummary }) {
    if (!stateSummary) return null
    const { demographicGroups } = stateSummary

    return (
        <div className="overflow-hidden rounded-xl border border-brand-muted/25 shadow-sm">
            {/* Header */}
            <div className="grid grid-cols-[1fr_140px_100px_140px] gap-x-4 items-center px-5 py-2.5 bg-brand-darkest text-brand-surface text-sm font-semibold">
                <span>Racial Group</span>
                <span className="text-right">Voting Age Pop.</span>
                <span className="text-right">VAP %</span>
                <span className="text-center">Gingles Feasible</span>
            </div>

            {demographicGroups.map((g, i) => (
                <div
                    key={g.group}
                    className={`grid grid-cols-[1fr_140px_100px_140px] gap-x-4 items-center px-5 py-3 text-sm border-t border-brand-muted/15 transition-colors hover:bg-brand-primary/5 ${i % 2 === 0 ? 'bg-white' : 'bg-brand-surface/60'}`}
                >
                    <span className="font-semibold text-gray-800">{g.group}</span>
                    <span className="tabular-nums text-gray-600 text-right">{g.vap.toLocaleString()}</span>
                    <span className="tabular-nums text-gray-600 text-right">{(g.vapPercentage * 100).toFixed(1)}%</span>
                    <div className="flex justify-center">
                        <Badge
                            variant="outline"
                            className={g.isFeasible
                                ? 'text-emerald-700 border-emerald-300 bg-emerald-50 text-xs font-semibold'
                                : 'text-gray-400 border-gray-200 bg-gray-50 text-xs'
                            }
                        >
                            {g.isFeasible ? 'Feasible' : 'Not Feasible'}
                        </Badge>
                    </div>
                </div>
            ))}
        </div>
    )
}
