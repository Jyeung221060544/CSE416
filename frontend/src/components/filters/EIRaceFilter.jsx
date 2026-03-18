/**
 * EIRaceFilter.jsx — Multi-select race filter for Ecological Inference KDE charts.
 *
 * Renders a checkbox group inside a CollapsibleGroup accordion.
 * Unlike RaceFilter (single-select), this allows multiple races to be shown
 * simultaneously as overlay lines on the KDE density charts.
 *
 * GUARD: At least one race must remain selected.  When only one is checked,
 * its checkbox is disabled so the user can't deselect the last item.
 *
 * PLACEMENT
 *   Shown in FilterPanel when:
 *     activeSection === 'racial-polarization' AND activeSubSection === 'ecological-inference'
 *
 * STATE SOURCE
 *   eiRaceFilter / toggleEiRaceFilter — from useFilters() (Zustand via useAppStore).
 *   demographicGroups                 — from useAppStore; populated by useStateData on load.
 */

import CollapsibleGroup from './CollapsibleGroup'
import useFilters from '../../hooks/useFilters'
import useAppStore from '@/store/useAppStore'


/**
 * EIRaceFilter — Multi-select checkbox group for EI KDE overlay lines.
 *
 * @returns {JSX.Element}
 */
export default function EIRaceFilter() {

    /* ── Step 1: Read filter state and available groups from Zustand ─────── */
    const { eiRaceFilter, toggleEiRaceFilter } = useFilters()
    const demographicGroups = useAppStore(s => s.demographicGroups)

    const eiRaceOptions = demographicGroups.map(g => ({
        value: g.group.toLowerCase(),
        label: g.group,
    }))

    /* ── Step 2: Render ──────────────────────────────────────────────────── */
    return (
        <CollapsibleGroup label="EI Race / Minority">
            {eiRaceOptions.map((opt) => {
                const checked = eiRaceFilter.includes(opt.value)

                /* Disable this checkbox if it's the only remaining selected item */
                const isLast  = checked && eiRaceFilter.length === 1

                return (
                    <label key={opt.value} className="flex items-center gap-2 px-1 py-1 cursor-pointer">
                        {/* Custom-styled checkbox — disabled state shows 50% opacity */}
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
