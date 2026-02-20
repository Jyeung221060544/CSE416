import useAppStore from '../../store/useAppStore'

export default function ResetFiltersButton() {
    const resetFilters = useAppStore((state) => state.resetFilters)

    return (
        <button
            onClick={resetFilters}
            className="w-full bg-slate-700 text-slate-100 hover:bg-teal-300 hover:text-black shadow-md shadow-black/100 text-sm py-1.5 rounded"
        >
            Reset Filters
        </button>
    )
}
