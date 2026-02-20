import { useState } from 'react'
import { ChevronLeft, ChevronRight, SlidersHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import FilterPanel from './FilterPanel'
import SectionPanel from './SectionPanel'

const iconSize = "[&_svg]:!w-4 [&_svg]:!h-4"

export default function Sidebar() {
    const [collapsed, setCollapsed] = useState(false)

    return (
        <aside
            className={`
                relative flex flex-col h-full bg-slate-800 border-r border-brand-deep
                transition-all duration-300 ease-in-out shrink-0
                ${collapsed ? 'w-14' : 'w-64'}
            `}
        >
            {/* ── Collapse Toggle ────────────────────────────── */}
            <Button
                variant="ghost"
                size="icon"
                onClick={() => setCollapsed(!collapsed)}
                className={`
                    absolute -right-3 top-6 z-10
                    w-6 h-6 rounded-full
                    bg-brand-primary text-white
                    hover:bg-white hover:text-black
                    shadow-md shadow-black/20
                    border border-brand-muted
                    ${iconSize}
                `}
            >
                {collapsed ? <ChevronRight /> : <ChevronLeft />}
            </Button>

            {/* ── Scrollable Content ─────────────────────────── */}
            <ScrollArea className="flex-1 overflow-hidden">
                <div className="flex flex-col gap-6 py-5 px-3">

                    {/* ── Sections Nav ───────────────────────── */}
                    <SectionPanel collapsed={collapsed} />

                    {/* ── Local Filters ──────────────────────── */}
                    <div className="flex flex-col gap-2">

                        {/* Header */}
                        <div className="flex items-center gap-2 px-1">
                            <SlidersHorizontal className="w-4 h-4 text-brand-surface shrink-0" />
                            {!collapsed && (
                                <span className="text-brand-surface text-xs font-bold uppercase tracking-widest">
                                    Local Filters
                                </span>
                            )}
                        </div>

                        <Separator className="bg-brand-deep" />

                        {/* Dynamic Filter Panel */}
                        {!collapsed && (
                            <div className="px-1">
                                <FilterPanel />
                            </div>
                        )}
                    </div>
                </div>
            </ScrollArea>
        </aside>
    )
}
