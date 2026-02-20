import useFilters from '../../hooks/useFilters'

export default function ResetFiltersButton() {
    const { resetFilters } = useFilters()

    return (
        <button
            onClick={resetFilters}
            className="w-full bg-brand-deep text-brand-surface hover:bg-white hover:text-black shadow-md shadow-black/20 text-sm py-1.5 rounded transition-colors duration-150"
        >
            Reset Filters
        </button>
    )
}
