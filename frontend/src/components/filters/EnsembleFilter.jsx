
import CollapsibleGroup from './CollapsibleGroup'
import useFilters from '../../hooks/useFilters'


/* ── Step 0: Ensemble type options ───────────────────────────────────────── */
/* Values correspond to ensembleType strings in the splits / ensemble data. */
const ENSEMBLE_OPTIONS = [
    { value: 'race_blind', label: 'Race-Blind' },
    { value: 'vra',        label: 'VRA-Constrained' },
]


/**
 * EnsembleFilter — Single-select radio group for ensemble type selection.
 *
 * @returns {JSX.Element}
 */
export default function EnsembleFilter() {
    const { ensembleFilter, setEnsembleFilter } = useFilters()
    return (
        <CollapsibleGroup label="Ensemble Type">
            {ENSEMBLE_OPTIONS.map((opt) => (
                <label key={opt.value} className="flex items-center gap-2 px-1 py-1 cursor-pointer">
                    <input
                        type="radio"
                        name="ensembleFilter"
                        value={opt.value}
                        checked={ensembleFilter === opt.value}
                        onChange={() => setEnsembleFilter(opt.value)}
                        className="appearance-none w-4 h-4 rounded-full border border-brand-primary checked:bg-brand-primary checked:border-brand-primary transition-colors shrink-0"
                    />
                    <span className="text-sm text-brand-surface">{opt.label}</span>
                </label>
            ))}
        </CollapsibleGroup>
    )
}
