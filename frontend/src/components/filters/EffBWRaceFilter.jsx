
import useAppStore from '../../store/useAppStore'
import CollapsibleGroup from './CollapsibleGroup'


/**
 * EffBWRaceFilter — Multi-select checkbox group for non-white feasible race options.
 * Controls which racial groups are shown in the Effectiveness Box & Whisker chart.
 *
 * @returns {JSX.Element}
 */
export default function EffBWRaceFilter() {

    const effBWRaceFilter       = useAppStore(s => s.effBWRaceFilter)
    const toggleEffBWRaceFilter = useAppStore(s => s.toggleEffBWRaceFilter)
    const demographicGroups     = useAppStore(s => s.demographicGroups)
    const options = demographicGroups
        .filter(g => g.isFeasible && g.group.toLowerCase() !== 'white')
        .map(g => ({ value: g.group.toLowerCase(), label: g.group.charAt(0).toUpperCase() + g.group.slice(1) }))

    return (
        <CollapsibleGroup label="Minority Races">
            {options.map((opt) => {
                const checked = effBWRaceFilter.includes(opt.value)
                const isLast  = checked && effBWRaceFilter.length === 1

                return (
                    <label key={opt.value} className="flex items-center gap-2 px-1 py-1 cursor-pointer">
                        <input
                            type="checkbox"
                            value={opt.value}
                            checked={checked}
                            disabled={isLast}
                            onChange={() => toggleEffBWRaceFilter(opt.value)}
                            className="appearance-none w-4 h-4 rounded border border-brand-primary checked:bg-brand-primary checked:border-brand-primary transition-colors shrink-0 disabled:opacity-50"
                        />
                        <span className="text-sm text-brand-surface">{opt.label}</span>
                    </label>
                )
            })}
        </CollapsibleGroup>
    )
}
