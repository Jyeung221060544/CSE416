import { useState } from 'react'
import { ChevronLeft, ChevronRight, SlidersHorizontal, LayoutList } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import useAppStore from '../store/useAppStore'
import FilterPanel from './FilterPanel'

const SECTIONS = [
    { id: 'state-overview',      label: 'State Overview' },
    { id: 'demographic',         label: 'Demographic Data' },
    { id: 'racial-polarization', label: 'Racial Polarization' },
    { id: 'ensemble-analysis',   label: 'Ensemble Analysis' },
]

const iconSize = "[&_svg]:!w-4 [&_svg]:!h-4"

export default function Sidebar() {
    const [collapsed, setCollapsed] = useState(false)
    const { activeSection, setActiveSection } = useAppStore()

    const scrollToSection = (id) => {
        setActiveSection(id)
        const el = document.getElementById(id)
        if (el) el.scrollIntoView({ behavior: 'smooth' })
    }

    return (
        <aside
            className={`
                relative flex flex-col h-full bg-white border-r border-gray-200
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
                    bg-teal-500 text-black
                    hover:bg-black hover:text-white
                    shadow-md shadow-black/10
                    border border-teal-400
                    ${iconSize}
                `}
            >
                {collapsed ? <ChevronRight /> : <ChevronLeft />}
            </Button>

            {/* ── Scrollable Content ─────────────────────────── */}
            <ScrollArea className="flex-1 overflow-hidden">
                <div className="flex flex-col gap-6 py-5 px-3">

                    {/* ── Local Filters ──────────────────────── */}
                    <div className="flex flex-col gap-2">

                        {/* Header */}
                        <div className="flex items-center gap-2 px-1">
                            <SlidersHorizontal className="w-4 h-4 text-teal-600 shrink-0" />
                            {!collapsed && (
                                <span className="text-teal-600 text-xs font-semibold uppercase tracking-widest">
                                    Local Filters
                                </span>
                            )}
                        </div>

                        <Separator className="bg-gray-200" />

                        {/* Dynamic Filter Panel */}
                        {!collapsed && (
                            <div className="px-1">
                                <FilterPanel />
                            </div>
                        )}
                    </div>

                    {/* ── Sections Nav ───────────────────────── */}
                    <div className="flex flex-col gap-2">

                        {/* Header */}
                        <div className="flex items-center gap-2 px-1">
                            <LayoutList className="w-4 h-4 text-teal-600 shrink-0" />
                            {!collapsed && (
                                <span className="text-teal-600 text-xs font-semibold uppercase tracking-widest">
                                    Sections
                                </span>
                            )}
                        </div>

                        <Separator className="bg-gray-200" />

                        {/* Nav Pills */}
                        <div className="flex flex-col gap-1.5 px-1">
                            {SECTIONS.map((section) => {
                                const isActive = activeSection === section.id

                                return collapsed ? (
                                    <TooltipProvider key={section.id} delayDuration={100}>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => scrollToSection(section.id)}
                                                    className={`
                                                        w-8 h-8 mx-auto rounded-full
                                                        ${isActive
                                                            ? 'bg-teal-800 text-white'
                                                            : 'bg-teal-500 text-black hover:bg-black hover:text-white'
                                                        }
                                                        shadow-sm shadow-black/10
                                                    `}
                                                >
                                                    <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-white' : 'bg-black'}`} />
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent side="right" className="bg-black text-white border-gray-700">
                                                {section.label}
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                ) : (
                                    <Button
                                        key={section.id}
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => scrollToSection(section.id)}
                                        className={`
                                            w-full justify-start rounded-full text-sm font-medium
                                            transition-colors duration-150
                                            ${isActive
                                                ? 'bg-teal-900 text-white hover:bg-teal-1000 hover:text-white'
                                                : 'bg-teal-500 text-black hover:bg-black hover:text-white'
                                            }
                                            shadow-sm shadow-black/10
                                        `}
                                    >
                                        {section.label}
                                    </Button>
                                )
                            })}
                        </div>
                    </div>
                </div>
            </ScrollArea>
        </aside>
    )
}
