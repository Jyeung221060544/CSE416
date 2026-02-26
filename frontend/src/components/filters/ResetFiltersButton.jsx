/**
 * ResetFiltersButton.jsx — One-click button to reset all sidebar filters to defaults.
 *
 * Always rendered at the bottom of FilterPanel (below every active filter group).
 * Calls resetFilters() from Zustand, which restores all filter slices to their
 * initial values as defined in useAppStore.
 *
 * STATE SOURCE
 *   resetFilters — from useFilters() (Zustand via useAppStore).
 */

import useFilters from '../../hooks/useFilters'
import { Button }  from '@/components/ui/button'


/**
 * ResetFiltersButton — Full-width button that resets all active filter selections.
 *
 * @returns {JSX.Element}
 */
export default function ResetFiltersButton() {

    /* ── Step 0: Read reset action from Zustand ──────────────────────────── */
    const { resetFilters } = useFilters()


    /* ── Step 1: Render ──────────────────────────────────────────────────── */
    return (
        <Button
            onClick={resetFilters}
            className="w-full bg-brand-primary text-brand-surface hover:bg-white hover:text-black shadow-md shadow-black/20 text-sm py-1.5 rounded"
        >
            Reset All Filters
        </Button>
    )
}
