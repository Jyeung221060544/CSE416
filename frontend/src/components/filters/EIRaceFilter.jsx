import CollapsibleGroup from './CollapsibleGroup'
import useFilters from '../../hooks/useFilters'

const EI_RACE_OPTIONS = [
    { value: 'white',    label: 'White' },
    { value: 'black',    label: 'Black' },
    { value: 'hispanic', label: 'Hispanic' },
    { value: 'asian',    label: 'Asian' },
]

export default function EIRaceFilter() {
    const { eiRaceFilter, toggleEiRaceFilter } = useFilters()

    return (
        <CollapsibleGroup label="Ecological Inference Race">
            {EI_RACE_OPTIONS.map((opt) => {
                const checked = eiRaceFilter.includes(opt.value)
                const isLast = checked && eiRaceFilter.length === 1
                return (
                    <label key={opt.value} className="flex items-center gap-2 px-1 py-1 cursor-pointer">
                        <input
                            type="checkbox"
                            value={opt.value}
                            checked={checked}
                            disabled={isLast}
                            onChange={() => toggleEiRaceFilter(opt.value)}
                            className="appearance-none w-4 h-4 rounded border border-brand-muted checked:bg-brand-primary checked:border-brand-primary transition-colors shrink-0 disabled:opacity-50"
                        />
                        <span className="text-sm text-brand-surface">{opt.label}</span>
                    </label>
                )
            })}
        </CollapsibleGroup>
    )
}
