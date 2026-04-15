/**
 * EffBWRaceFilter.jsx — Multi-select race filter for the Effectiveness Box & Whisker chart.
 *
 * Shows only feasible non-white racial groups.  Selecting a subset controls which
 * groups appear as x-axis positions in the EffectivenessBoxWhisker chart.
 *
 * GUARD: At least one race must remain selected.  When only one is checked,
 * its checkbox is disabled so the user can't deselect the last item.
 *
 * STATE SOURCE
 *   effBWRaceFilter / toggleEffBWRaceFilter — from Zustand (useAppStore).
 *   demographicGroups                       — from Zustand; populated by useStateData on load.
 */

import useAppStore from '../../store/useAppStore'
import CollapsibleGroup from './CollapsibleGroup'


/**
 * EffBWRaceFilter — Multi-select checkbox group for non-white feasible race options.
 * Controls which racial groups are shown in the Effectiveness Box & Whisker chart.
 *
 * @returns {JSX.Element}
 */
export default function EffBWRaceFilter() {

    /* ── Step 1: Read filter state and demographic groups from Zustand ───── */
    const effBWRaceFilter       = useAppStore(s => s.effBWRaceFilter)
    const toggleEffBWRaceFilter = useAppStore(s => s.toggleEffBWRaceFilter)
    const demographicGroups     = useAppStore(s => s.demographicGroups)

    /* ── Step 2: Derive non-white feasible race options ──────────────────── */
    const options = demographicGroups
        .filter(g => g.isFeasible && g.group.toLowerCase() !== 'white')
        .map(g => ({ value: g.group.toLowerCase(), label: g.group }))


    /* ── Step 3: Render ──────────────────────────────────────────────────── */
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
