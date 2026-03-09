/**
 * Select2RaceFilter.jsx — Up-to-2 race selector for EI Polarization KDE comparison.
 *
 * Renders a checkbox group where the user picks exactly 2 races to compare.
 * Any number of races can be selected (0, 1, or 2); the chart shows an empty-state
 * message until exactly 2 are active.  When a 3rd is selected it replaces the oldest.
 *
 * Available options are derived from the dynamically-loaded demographicGroups in
 * Zustand (all groups, not filtered by isFeasible), so the list adapts per state
 * without hardcoding any race keys.
 *
 * STATE SOURCE
 *   eiKdeCompareRaces / setEiKdeCompareRaces — from useAppStore (Zustand).
 *   demographicGroups                        — from useAppStore (set by useStateData).
 */

import { useMemo }      from 'react'
import CollapsibleGroup from './CollapsibleGroup'
import useAppStore      from '../../store/useAppStore'
import { RACE_COLORS }  from '@/lib/partyColors'


export default function Select2RaceFilter() {

    /* ── Step 1: Read state from Zustand ─────────────────────────────────── */
    const demographicGroups    = useAppStore(s => s.demographicGroups)
    const eiKdeCompareRaces    = useAppStore(s => s.eiKdeCompareRaces)
    const setEiKdeCompareRaces = useAppStore(s => s.setEiKdeCompareRaces)

    /* ── Step 2: Build option list from demographicGroups (all, not feasible) */
    const options = useMemo(() =>
        demographicGroups.map(g => ({
            value: g.group.toLowerCase(),
            label: g.group,
        })),
    [demographicGroups])


    /* ── Toggle handler ──────────────────────────────────────────────────── */
    function handleToggle(value) {
        const current = eiKdeCompareRaces
        if (current.includes(value)) {
            setEiKdeCompareRaces(current.filter(r => r !== value))
        } else if (current.length < 2) {
            setEiKdeCompareRaces([...current, value])
        }
        // At limit: unselected items are disabled — click cannot fire
    }


    /* ── Render ──────────────────────────────────────────────────────────── */
    const atLimit = eiKdeCompareRaces.length >= 2

    return (
        <CollapsibleGroup label="Compare Two Races">

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
