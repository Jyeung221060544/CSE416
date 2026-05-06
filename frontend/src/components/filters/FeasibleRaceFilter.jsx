import useAppStore from '../../store/useAppStore'
import CollapsibleGroup from './CollapsibleGroup'
import useFilters from '../../hooks/useFilters'


/**
 * FeasibleRaceFilter — Single-select radio group for feasible-only race options.
 *
 * @returns {JSX.Element}
 */
export default function FeasibleRaceFilter() {

    const { feasibleRaceFilter, setFeasibleRaceFilter } = useFilters()
    const demographicGroups = useAppStore(s => s.demographicGroups)
    const feasibleRaces = demographicGroups
        .filter(g => g.isFeasible)
        .map(g => ({ value: g.group.toLowerCase(), label: g.group.charAt(0).toUpperCase() + g.group.slice(1) }))
    return (
        <CollapsibleGroup label="Race">
            {feasibleRaces.map((opt) => (
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
                Gingles-eligible groups only
            </p>
        </CollapsibleGroup>
    )
}
