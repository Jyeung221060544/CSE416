import SurfacePanel from '@/components/ui/surface-panel'
import { ROW_BORDER, TABLE_HEADER, rowBg } from '@/lib/tableStyles'

const TYPE_META = {
    'race-blind':      { label: 'Race-Blind' },
    'vra-constrained': { label: 'VRA-Constrained' },
}

export default function EnsembleSummaryTable({ ensembleSummary }) {
    if (!ensembleSummary) return null
    const { ensembles } = ensembleSummary

    return (
        <SurfacePanel className="overflow-x-auto border-brand-muted/25">
            <div className="min-w-[280px]">

                {/* Header */}
                <div className={`grid grid-cols-[1fr_80px_90px] items-center px-5 py-3 ${TABLE_HEADER}`}>
                    <span>Type</span>
                    <span className="text-center">Plans</span>
                    <span className="text-right">Threshold</span>
                </div>

                {/* Rows */}
                {ensembles.map((e, i) => {
                    const meta = TYPE_META[e.ensembleType] ?? { label: e.ensembleType }
                    const threshold = e.populationEqualityThreshold != null
                        ? `±${(e.populationEqualityThreshold * 100).toFixed(0)}%`
                        : '—'

                    return (
                        <div
                            key={e.ensembleId}
                            className={[
                                'grid grid-cols-[1fr_80px_90px] items-center',
                                'px-5 py-3.5 transition-colors',
                                ROW_BORDER,
                                rowBg(i),
                            ].join(' ')}
                        >
                            <span className="font-bold text-sm text-brand-deep">
                                {meta.label}
                            </span>

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
