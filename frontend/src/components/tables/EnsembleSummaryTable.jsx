import { Badge } from '@/components/ui/badge'
import SurfacePanel from '@/components/ui/surface-panel'

const TYPE_META = {
    'race-blind': {
        label: 'Race-Blind',
        badge: 'text-gray-700 border-gray-300 bg-gray-50',
    },
    'vra-constrained': {
        label: 'VRA-Constrained',
        badge: 'text-brand-primary border-brand-primary/40 bg-brand-primary/5',
    },
}

export default function EnsembleSummaryTable({ ensembleSummary }) {
    if (!ensembleSummary) return null
    const { ensembles } = ensembleSummary

    return (
        <SurfacePanel className="overflow-x-auto border-brand-muted/25">
            <div className="min-w-[280px]">

                {/* Header */}
                <div className="grid grid-cols-[1fr_80px_90px] items-center px-5 py-3 bg-brand-darkest text-brand-surface text-sm font-semibold">
                    <span>Type</span>
                    <span className="text-center">Plans</span>
                    <span className="text-right">Threshold</span>
                </div>

                {/* Rows */}
                {ensembles.map((e, i) => {
                    const meta = TYPE_META[e.ensembleType] ?? { label: e.ensembleType, badge: TYPE_META['race-blind'].badge }
                    const threshold = e.populationEqualityThreshold != null
                        ? `±${(e.populationEqualityThreshold * 100).toFixed(0)}%`
                        : '—'

                    return (
                        <div
                            key={e.ensembleId}
                            className={[
                                'grid grid-cols-[1fr_80px_90px] items-center',
                                'px-5 py-3.5 border-t border-brand-muted/15',
                                'transition-colors hover:bg-brand-primary/5',
                                i % 2 === 0 ? 'bg-white' : 'bg-brand-surface/60',
                            ].join(' ')}
                        >
                            <Badge
                                variant="outline"
                                className={`w-fit text-sm font-semibold px-2.5 ${meta.badge}`}
                            >
                                {meta.label}
                            </Badge>

                            <span className="text-center tabular-nums font-bold text-brand-deep text-sm">
                                {e.numPlans.toLocaleString()}
                            </span>

                            <span className="text-right tabular-nums font-bold text-brand-deep text-sm">
                                {threshold}
                            </span>
                        </div>
                    )
                })}

            </div>
        </SurfacePanel>
    )
}
