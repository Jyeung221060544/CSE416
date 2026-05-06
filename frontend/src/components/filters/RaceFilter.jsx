
import CollapsibleGroup from './CollapsibleGroup'
import useFilters from '../../hooks/useFilters'
import useAppStore from '@/store/useAppStore'


/**
 * RaceFilter — Single-select radio group for the heatmap race layer.
 *
 * @returns {JSX.Element}
 */
export default function RaceFilter() {

    const { raceFilter, setRaceFilter } = useFilters()
    const demographicGroups = useAppStore(s => s.demographicGroups)

    const raceOptions = demographicGroups.map(g => ({
        value: g.group.toLowerCase(),
        label: g.group.charAt(0).toUpperCase() + g.group.slice(1),
    }))

    return (
        <CollapsibleGroup label="Race">
            {raceOptions.map((opt) => (
                <label key={opt.value} className="flex items-center gap-2 px-1 py-1 cursor-pointer">
                    {/* Custom-styled radio button — uses Tailwind appearance-none + checked: variants */}
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
