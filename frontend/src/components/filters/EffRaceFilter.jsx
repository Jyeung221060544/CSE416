/**
 * EffRaceFilter.jsx — Single-select race filter for Effectiveness Histogram + VRA Impact Table.
 *
 * Shows only feasible non-white racial groups.  This keeps the filter focused on
 * minority communities of interest and avoids duplicating the white-majority baseline
 * that the ensemble analysis already captures.
 *
 * STATE SOURCE
 *   effRaceFilter / setEffRaceFilter — from Zustand (useAppStore).
 *   demographicGroups               — from Zustand; populated by useStateData on load.
 */

import useAppStore from '../../store/useAppStore'
import CollapsibleGroup from './CollapsibleGroup'


/**
 * EffRaceFilter — Single-select radio group for non-white feasible race options.
 * Drives both the Effectiveness Histogram and the VRA Impact Table.
 *
 * @returns {JSX.Element}
 */
export default function EffRaceFilter() {

    /* ── Step 1: Read filter state and demographic groups from Zustand ───── */
    const effRaceFilter    = useAppStore(s => s.effRaceFilter)
    const setEffRaceFilter = useAppStore(s => s.setEffRaceFilter)
    const demographicGroups = useAppStore(s => s.demographicGroups)

    /* ── Step 2: Derive non-white feasible race options ──────────────────── */
    const options = demographicGroups
        .filter(g => g.isFeasible && g.group.toLowerCase() !== 'white')
        .map(g => ({ value: g.group.toLowerCase(), label: g.group }))


    /* ── Step 3: Render ──────────────────────────────────────────────────── */
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
