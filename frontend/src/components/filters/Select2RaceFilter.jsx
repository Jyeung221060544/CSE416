import { useMemo }      from 'react'
import CollapsibleGroup from './CollapsibleGroup'
import useAppStore      from '../../store/useAppStore'
import { RACE_COLORS }  from '@/lib/partyColors'


export default function Select2RaceFilter() {

    const demographicGroups    = useAppStore(s => s.demographicGroups)
    const eiKdeCompareRaces    = useAppStore(s => s.eiKdeCompareRaces)
    const setEiKdeCompareRaces = useAppStore(s => s.setEiKdeCompareRaces)

    const options = useMemo(() =>
        demographicGroups.map(g => ({
            value: g.group.toLowerCase(),
            label: g.group.charAt(0).toUpperCase() + g.group.slice(1),
        })),
    [demographicGroups])


    function handleToggle(value) {
        const current = eiKdeCompareRaces
        if (current.includes(value)) {
            setEiKdeCompareRaces(current.filter(r => r !== value))
        } else if (current.length < 2) {
            setEiKdeCompareRaces([...current, value])
        }
    }

    const atLimit = eiKdeCompareRaces.length >= 2
    return (
        <CollapsibleGroup label="Race Pair">

            <p className="text-[10px] text-brand-muted/70 px-1 pb-1 leading-snug italic">
                Select 2 groups to compare.
            </p>

            {options.map(opt => {
                const checked     = eiKdeCompareRaces.includes(opt.value)
                const disabled    = !checked && atLimit
                const swatchColor = RACE_COLORS[opt.value] ?? '#94a3b8'

                return (
                    <label key={opt.value} className={`flex items-center gap-2 px-1 py-1 ${disabled ? 'opacity-40' : 'cursor-pointer'}`}>
                        <input
                            type="checkbox"
                            value={opt.value}
                            checked={checked}
                            disabled={disabled}
                            onChange={() => handleToggle(opt.value)}
                            className="appearance-none w-4 h-4 rounded border border-brand-primary checked:bg-brand-primary checked:border-brand-primary transition-colors shrink-0"
                        />
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: swatchColor, flexShrink: 0, display: 'inline-block' }} />
                        <span className="text-sm text-brand-surface">{opt.label}</span>
                    </label>
                )
            })}

            <div className="mt-1 px-1 text-[10px] font-semibold text-brand-primary/80">
                {eiKdeCompareRaces.length} / 2 selected
            </div>

        </CollapsibleGroup>
    )
}
