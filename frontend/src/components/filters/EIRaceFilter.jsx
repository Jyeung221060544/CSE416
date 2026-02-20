import { useState } from 'react'
import { ChevronUp, ChevronDown } from 'lucide-react'
import useAppStore from '../../store/useAppStore'

const EI_RACE_OPTIONS = [
    { value: 'white',    label: 'White' },
    { value: 'black',    label: 'Black' },
    { value: 'hispanic', label: 'Hispanic' },
    { value: 'asian',    label: 'Asian' },
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

export default function EIRaceFilter() {
    const eiRaceFilter = useAppStore((state) => state.eiRaceFilter)
    const toggleEiRaceFilter = useAppStore((state) => state.toggleEiRaceFilter)

    return (
        <CollapsibleGroup label="Ecological Inference Race">
            {EI_RACE_OPTIONS.map((opt) => {
                const checked = eiRaceFilter.includes(opt.value)
                const isLast = checked && eiRaceFilter.length === 1
                return (
                    <label key={opt.value} className="flex items-center gap-2 px-1 py-1 cursor-pointer">
                        <input
                            type="checkbox"
                            value={opt.value}
                            checked={checked}
                            disabled={isLast}
                            onChange={() => toggleEiRaceFilter(opt.value)}
                            className="appearance-none w-4 h-4 rounded border border-slate-500 checked:bg-teal-400 checked:border-teal-400 transition-colors shrink-0 disabled:opacity-50"
                        />
                        <span className="text-sm text-slate-200">{opt.label}</span>
                    </label>
                )
            })}
        </CollapsibleGroup>
    )
}
