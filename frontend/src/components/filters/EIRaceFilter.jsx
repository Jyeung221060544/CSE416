
import CollapsibleGroup from './CollapsibleGroup'
import useFilters from '../../hooks/useFilters'
import useAppStore from '@/store/useAppStore'

/**
 * EIRaceFilter — Multi-select checkbox group for EI KDE overlay lines.
 *
 * @returns {JSX.Element}
 */
export default function EIRaceFilter() {

    const { eiRaceFilter, toggleEiRaceFilter } = useFilters()
    const demographicGroups = useAppStore(s => s.demographicGroups)

    const eiRaceOptions = demographicGroups.map(g => ({
        value: g.group.toLowerCase(),
        label: g.group.charAt(0).toUpperCase() + g.group.slice(1),
    }))

    return (
        <CollapsibleGroup label="Race">
            {eiRaceOptions.map((opt) => {
                const checked = eiRaceFilter.includes(opt.value)

                const isLast  = checked && eiRaceFilter.length === 1

                return (
                    <label key={opt.value} className="flex items-center gap-2 px-1 py-1 cursor-pointer">
                        <input
                            type="checkbox"
                            value={opt.value}
                            checked={checked}
                            disabled={isLast}
                            onChange={() => toggleEiRaceFilter(opt.value)}
                            className="appearance-none w-4 h-4 rounded border border-brand-primary checked:bg-brand-primary checked:border-brand-primary transition-colors shrink-0 disabled:opacity-50"
                        />
                        <span className="text-sm text-brand-surface">{opt.label}</span>
                    </label>
                )
            })}
        </CollapsibleGroup>
    )
}
