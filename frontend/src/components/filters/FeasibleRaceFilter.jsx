import CollapsibleGroup from './CollapsibleGroup'
import useFilters from '../../hooks/useFilters'

// Only races that meet the 400,000 VAP feasibility threshold for Alabama.
// Expand this list when real API data confirms additional groups are feasible.
const FEASIBLE_RACES = [
    { value: 'black', label: 'Black' },
    { value: 'white', label: 'White' },
]

export default function FeasibleRaceFilter() {
    const { feasibleRaceFilter, setFeasibleRaceFilter } = useFilters()

    return (
        <CollapsibleGroup label="Feasible Race / Ethnicity">
            {FEASIBLE_RACES.map((opt) => (
                <label key={opt.value} className="flex items-center gap-2 px-1 py-1 cursor-pointer">
                    <input
                        type="radio"
                        name="feasibleRaceFilter"
                        value={opt.value}
                        checked={feasibleRaceFilter === opt.value}
                        onChange={() => setFeasibleRaceFilter(opt.value)}
                        className="appearance-none w-4 h-4 rounded-full border border-brand-primary checked:bg-brand-primary checked:border-brand-primary transition-colors shrink-0"
                    />
                    <span className="text-sm text-brand-surface">{opt.label}</span>
                </label>
            ))}
            <p className="text-[10px] text-white/70 px-1 pt-1 leading-snug">
                Groups with ≥ 400k VAP
            </p>
        </CollapsibleGroup>
    )
}
