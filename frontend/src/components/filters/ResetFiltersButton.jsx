import useFilters from '../../hooks/useFilters'
import { Button }  from '@/components/ui/button'

/**
 * ResetFiltersButton — Full-width button that resets all active filter selections.
 *
 * @returns {JSX.Element}
 */
export default function ResetFiltersButton() {
    const { resetFilters } = useFilters()
    return (
        <Button
            onClick={resetFilters}
            className="w-full bg-brand-primary text-brand-surface hover:bg-white hover:text-black shadow-md shadow-black/20 text-sm py-1.5 rounded"
        >
            Reset All Filters
        </Button>
    )
}
