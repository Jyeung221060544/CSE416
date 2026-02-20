import { useState } from 'react'
import { ChevronUp, ChevronDown } from 'lucide-react'
import useAppStore from '../../store/useAppStore'

const GRANULARITY_OPTIONS = [
    { value: 'precinct',     label: 'Precinct' },
    { value: 'census_block', label: 'Census Block' },
]

function CollapsibleGroup({ label, children }) {
    const [open, setOpen] = useState(true)
    return (
        <div className="flex flex-col gap-1.5">
            <button onClick={() => setOpen(!open)} className="flex items-center justify-between px-1 w-full">
                <span className="text-slate-400 text-xs uppercase tracking-wider">{label}</span>
                {open ? <ChevronUp className="w-3 h-3 text-slate-400" /> : <ChevronDown className="w-3 h-3 text-slate-400" />}
            </button>
            {open && <div className="flex flex-col">{children}</div>}
        </div>
    )
}

export default function GranularityFilter() {
    const granularityFilter = useAppStore((state) => state.granularityFilter)
    const setGranularityFilter = useAppStore((state) => state.setGranularityFilter)

    return (
        <CollapsibleGroup label="Granularity">
            {GRANULARITY_OPTIONS.map((opt) => (
                <label key={opt.value} className="flex items-center gap-2 px-1 py-1 cursor-pointer">
                    <input
                        type="radio"
                        name="granularityFilter"
                        value={opt.value}
                        checked={granularityFilter === opt.value}
                        onChange={() => setGranularityFilter(opt.value)}
                        className="appearance-none w-4 h-4 rounded-full border border-slate-500 checked:bg-teal-400 checked:border-teal-400 transition-colors shrink-0"
                    />
                    <span className="text-sm text-slate-200">{opt.label}</span>
                </label>
            ))}
        </CollapsibleGroup>
    )
}
