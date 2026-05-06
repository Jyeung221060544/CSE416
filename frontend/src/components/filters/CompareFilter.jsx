
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
