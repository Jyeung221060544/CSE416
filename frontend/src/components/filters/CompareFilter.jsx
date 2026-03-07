/**
 * CompareFilter.jsx — Toggle to switch Ensemble Analysis between side-by-side and compare view.
 *
 * When enabled, the active Ensemble Analysis tab (Splits or Box & Whisker) renders
 * a single overlaid compare chart instead of two separate side-by-side charts.
 *
 * PLACEMENT
 *   Shown in FilterPanel when activeSection === 'ensemble-analysis' (both tabs).
 *
 * STATE SOURCE
 *   eaCompareMode / setEaCompareMode — from useFilters() (Zustand via useAppStore).
 *   Resets to false on tab switch (handled in EnsembleAnalysisSection useEffect).
 */

import CollapsibleGroup from './CollapsibleGroup'
import useFilters from '../../hooks/useFilters'


export default function CompareFilter() {
    const { eaCompareMode, setEaCompareMode } = useFilters()

    return (
        <CollapsibleGroup label="View">
            <label className="flex items-center gap-2 px-1 py-1 cursor-pointer select-none">
                <input
                    type="checkbox"
                    checked={eaCompareMode}
                    onChange={e => setEaCompareMode(e.target.checked)}
                    className="appearance-none w-4 h-4 rounded border border-brand-primary checked:bg-brand-primary checked:border-brand-primary transition-colors shrink-0"
                />
                <span className="text-sm text-brand-surface">Compare Side-by-Side</span>
            </label>
        </CollapsibleGroup>
    )
}
