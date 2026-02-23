import { Badge } from '@/components/ui/badge'
import { FEASIBLE_CLS, NOT_FEASIBLE_CLS } from '@/lib/partyColors'
import { ROW_BORDER, TABLE_HEADER, INACTIVE_LABEL, rowBg } from '@/lib/tableStyles'

export default function StateSummaryTable({ stateSummary }) {
    if (!stateSummary) return null
    const { demographicGroups } = stateSummary

    return (
        <div className="overflow-hidden rounded-xl border border-brand-muted/25 shadow-sm">
            {/* Header */}
            <div className={`grid grid-cols-[1fr_140px_100px_140px] gap-x-4 items-center px-5 py-2.5 ${TABLE_HEADER}`}>
                <span>Racial Group</span>
                <span className="text-right">Voting Age Pop.</span>
                <span className="text-right">VAP %</span>
                <span className="text-center">Gingles Feasible</span>
            </div>

            {demographicGroups.map((g, i) => (
                <div
                    key={g.group}
                    className={`grid grid-cols-[1fr_140px_100px_140px] gap-x-4 items-center px-5 py-3 text-sm transition-colors ${ROW_BORDER} ${rowBg(i)}`}
                >
                    <span className={`font-bold text-sm ${INACTIVE_LABEL}`}>{g.group}</span>
                    <span className={`tabular-nums text-sm ${INACTIVE_LABEL} text-right`}>{g.vap.toLocaleString()}</span>
                    <span className={`tabular-nums text-sm ${INACTIVE_LABEL} text-right`}>{(g.vapPercentage * 100).toFixed(1)}%</span>
                    <div className="flex justify-center">
                        <Badge variant="outline" className={g.isFeasible ? FEASIBLE_CLS : NOT_FEASIBLE_CLS}>
                            {g.isFeasible ? 'Feasible' : 'Not Feasible'}
                        </Badge>
                    </div>
                </div>
            ))}
        </div>
    )
}
