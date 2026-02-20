import { useState } from 'react'
import { ChevronUp, ChevronDown } from 'lucide-react'

export default function CollapsibleGroup({ label, children }) {
    const [open, setOpen] = useState(true)
    return (
        <div className="flex flex-col gap-1.5">
            <button onClick={() => setOpen(!open)} className="flex items-center justify-between px-1 w-full">
                <span className="text-brand-surface text-xs uppercase tracking-wider">{label}</span>
                {open ? <ChevronUp className="w-3 h-3 text-brand-surface" /> : <ChevronDown className="w-3 h-3 text-brand-surface" />}
            </button>
            {open && <div className="flex flex-col">{children}</div>}
        </div>
    )
}
