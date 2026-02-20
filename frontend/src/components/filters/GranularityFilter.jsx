import CollapsibleGroup from './CollapsibleGroup'
import useFilters from '../../hooks/useFilters'

const GRANULARITY_OPTIONS = [
    { value: 'precinct',     label: 'Precinct' },
    { value: 'census_block', label: 'Census Block' },
]

export default function GranularityFilter() {
    const { granularityFilter, setGranularityFilter } = useFilters()

    return (
        <CollapsibleGroup label="Granularity">
            {GRANULARITY_OPTIONS.map((opt) => (
                <label key={opt.value} className="flex items-center gap-2 px-1 py-1 cursor-pointer">
                    <input
                        type="radio"
                        name="granularityFilter"
                        value={opt.value}
                        checked={granularityFilter === opt.value}
                        onChange={() => setGranularityFilter(opt.value)}
                        className="appearance-none w-4 h-4 rounded-full border border-brand-muted checked:bg-brand-primary checked:border-brand-primary transition-colors shrink-0"
                    />
                    <span className="text-sm text-brand-surface">{opt.label}</span>
                </label>
            ))}
        </CollapsibleGroup>
    )
}
