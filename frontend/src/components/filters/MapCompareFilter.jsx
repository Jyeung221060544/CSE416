/**
 * MapCompareFilter.jsx — Multi-select plan picker for the Representation Gap section.
 *
 * Lets the user choose exactly which two district plans are shown side-by-side.
 * Three options: Current Plan, High Effectiveness Plan, Low Effectiveness Plan.
 *
 * GUARDS
 *   Min 1: when only one plan remains checked, its checkbox is disabled so the
 *          user cannot deselect the last item.
 *   Max 2: when two plans are already checked, unchecked options are disabled so
 *          the user cannot select a third. Deselect one first before swapping.
 *
 * PLACEMENT
 *   Shown in FilterPanel when activeSection === 'representation-gap'.
 *
 * STATE SOURCE
 *   mapCompareFilter / toggleMapCompareFilter — from useAppStore (Zustand).
 */

import CollapsibleGroup from './CollapsibleGroup'
import useAppStore from '@/store/useAppStore'


const PLAN_OPTIONS = [
    { value: 'current', label: 'Current Plan'                },
    { value: 'low',     label: 'Post-VRA Decision Scenario'  },
]


/**
 * MapCompareFilter — Checkbox group for selecting the two comparison plans.
 * High Effectiveness Plan is OR-only: greyed out and unchecked for other states.
 *
 * @returns {JSX.Element}
 */
export default function MapCompareFilter() {

    const mapCompareFilter       = useAppStore(s => s.mapCompareFilter)
    const toggleMapCompareFilter = useAppStore(s => s.toggleMapCompareFilter)

    return (
        <CollapsibleGroup label="Compare Plans">
            {PLAN_OPTIONS.map((opt) => {
                const checked    = mapCompareFilter.includes(opt.value)
                const isLast     = checked && mapCompareFilter.length === 1
                const isMaxedOut = !checked && mapCompareFilter.length >= 2
                const disabled   = isLast || isMaxedOut

                return (
                    <label
                        key={opt.value}
                        className={`flex items-center gap-2 px-1 py-1 select-none ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                        <input
                            type="checkbox"
                            value={opt.value}
                            checked={checked}
                            disabled={disabled}
                            onChange={() => toggleMapCompareFilter(opt.value)}
                            className="appearance-none w-4 h-4 rounded border border-brand-primary checked:bg-brand-primary checked:border-brand-primary transition-colors shrink-0 disabled:opacity-40"
                        />
                        <span className={`text-sm text-brand-surface ${disabled ? 'opacity-40' : ''}`}>
                            {opt.label}
                        </span>
                    </label>
                )
            })}
        </CollapsibleGroup>
    )
}
