import CollapsibleGroup from './CollapsibleGroup'
import useFilters from '../../hooks/useFilters'

const RACE_OPTIONS = [
    { value: 'white',    label: 'White' },
    { value: 'black',    label: 'Black' },
    { value: 'hispanic', label: 'Hispanic' },
    { value: 'asian',    label: 'Asian' },
    { value: 'other',    label: 'Other' },
]

export default function RaceFilter() {
    const { raceFilter, setRaceFilter } = useFilters()

    return (
        <CollapsibleGroup label="Race / Ethnicity">
            {RACE_OPTIONS.map((opt) => (
                <label key={opt.value} className="flex items-center gap-2 px-1 py-1 cursor-pointer">
                    <input
                        type="radio"
                        name="raceFilter"
                        value={opt.value}
                        checked={raceFilter === opt.value}
                        onChange={() => setRaceFilter(opt.value)}
                        className="appearance-none w-4 h-4 rounded-full border border-brand-primary checked:bg-brand-primary checked:border-brand-primary transition-colors shrink-0"
                    />
                    <span className="text-sm text-brand-surface">{opt.label}</span>
                </label>
            ))}
        </CollapsibleGroup>
    )
}
