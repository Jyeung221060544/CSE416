
import useAppStore from '../../store/useAppStore'
import CollapsibleGroup from './CollapsibleGroup'


/**
 * EffRaceFilter — Single-select radio group for non-white feasible race options.
 * Drives both the Effectiveness Histogram and the VRA Impact Table.
 *
 * @returns {JSX.Element}
 */
export default function EffRaceFilter() {

    const effRaceFilter    = useAppStore(s => s.effRaceFilter)
    const setEffRaceFilter = useAppStore(s => s.setEffRaceFilter)
    const demographicGroups = useAppStore(s => s.demographicGroups)

    const options = demographicGroups
        .filter(g => g.isFeasible && g.group.toLowerCase() !== 'white')
        .map(g => ({ value: g.group.toLowerCase(), label: g.group.charAt(0).toUpperCase() + g.group.slice(1) }))

    return (
        <CollapsibleGroup label="Minority Race">
            {options.map((opt) => (
                <label key={opt.value} className="flex items-center gap-2 px-1 py-1 cursor-pointer">
                    <input
                        type="radio"
                        name="effRaceFilter"
                        value={opt.value}
                        checked={effRaceFilter === opt.value}
                        onChange={() => setEffRaceFilter(opt.value)}
                        className="appearance-none w-4 h-4 rounded-full border border-brand-primary checked:bg-brand-primary checked:border-brand-primary transition-colors shrink-0"
                    />
                    <span className="text-sm text-brand-surface">{opt.label}</span>
                </label>
            ))}

            <p className="text-[10px] text-white/70 px-1 pt-1 leading-snug">
                Feasible non-white groups only
            </p>
        </CollapsibleGroup>
    )
}
