import { useState } from 'react'
import { ChevronUp, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function CollapsibleGroup({ label, children }) {
    const [open, setOpen] = useState(true)
    return (
        <div className="flex flex-col gap-1.5">
            <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setOpen(!open)}
                className="justify-between px-1 w-full text-brand-surface hover:bg-white/10 hover:text-brand-surface"
            >
                <span className="text-brand-surface text-xs uppercase tracking-wider">{label}</span>
                {open ? <ChevronUp className="w-3 h-3 text-brand-surface" /> : <ChevronDown className="w-3 h-3 text-brand-surface" />}
            </Button>
            {open && <div className="flex flex-col">{children}</div>}
        </div>
    )
}
