import { Badge } from '@/components/ui/badge'

// Human-readable labels for ensemble types
const TYPE_META = {
    'race-blind': {
        label:  'Race-Blind',
        badge:  'text-gray-700 border-gray-300 bg-gray-50',
    },
    'vra-constrained': {
        label:  'VRA-Constrained',
        badge:  'text-brand-primary border-brand-primary/40 bg-brand-primary/5',
    },
}

export default function EnsembleSummaryTable({ ensembleSummary }) {
    if (!ensembleSummary) return null
    const { ensembles } = ensembleSummary

    return (
        <div className="overflow-hidden rounded-xl border border-brand-muted/25 shadow-sm">
            {/* Header */}
            <div
                className="grid items-center px-4 py-2.5 bg-brand-darkest text-brand-surface text-[11px] font-bold uppercase tracking-widest"
                style={{ gridTemplateColumns: '1fr 56px 80px 1.4fr' }}
            >
                <span>Type</span>
                <span className="text-right">Plans</span>
                <span className="text-center">Threshold</span>
                <span className="pl-3">Description</span>
            </div>

            {ensembles.map((e, i) => {
                const meta = TYPE_META[e.ensembleType] ?? { label: e.ensembleType, badge: TYPE_META['race-blind'].badge }
                const threshold = e.populationEqualityThreshold != null
                    ? `±${(e.populationEqualityThreshold * 100).toFixed(0)}%`
                    : '—'

                return (
                    <div
                        key={e.ensembleId}
                        className={`grid items-stretch border-t border-brand-muted/15 transition-colors hover:bg-brand-primary/5 ${i % 2 === 0 ? 'bg-white' : 'bg-brand-surface/60'}`}
                        style={{ gridTemplateColumns: '1fr 56px 80px 1.4fr' }}
                    >
                        {/* Type badge */}
                        <div className="flex items-center px-4 py-4 border-r border-brand-muted/15">
                            <Badge
                                variant="outline"
                                className={`w-fit text-xs font-semibold px-2.5 ${meta.badge}`}
                            >
                                {meta.label}
                            </Badge>
                        </div>

                        {/* Plans */}
                        <div className="flex items-center justify-end px-3 py-4 border-r border-brand-muted/15">
                            <span className="tabular-nums font-bold text-brand-deep text-sm">
                                {e.numPlans.toLocaleString()}
                            </span>
                        </div>

                        {/* Threshold — big prominent number */}
                        <div className="flex flex-col items-center justify-center py-4 border-r border-brand-muted/15">
                            <span className="text-2xl font-extrabold tabular-nums text-brand-deep leading-none">
                                {threshold}
                            </span>
                            <span className="text-[9px] text-brand-muted/50 uppercase tracking-widest mt-1 font-semibold">
                                pop. eq.
                            </span>
                        </div>

                        {/* Description */}
                        <div className="flex items-center px-3 py-4">
                            <span className="text-gray-500 text-xs leading-relaxed">{e.description}</span>
                        </div>
                    </div>
                )
            })}
        </div>
    )
}
