import { LayoutList } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import useAppStore from '../store/useAppStore'
import { lockScroll } from '../utils/scrollLock'

const SECTIONS = [
    { id: 'state-overview',      label: 'State Overview' },
    { id: 'demographic',         label: 'Demographic Data' },
    { id: 'racial-polarization', label: 'Racial Polarization' },
    { id: 'ensemble-analysis',   label: 'Ensemble Analysis' },
]

export default function SectionPanel({ collapsed }) {
    const { activeSection, setActiveSection } = useAppStore()

    const scrollToSection = (id) => {
        lockScroll()
        setActiveSection(id)
        const el = document.getElementById(id)
        if (el) el.scrollIntoView({ behavior: 'smooth' })
    }

    return (
        <div className="flex flex-col gap-2">

            {/* Header */}
            <div className="flex items-center gap-2 px-1">
                <LayoutList className="w-4 h-4 text-teal-400 shrink-0" />
                {!collapsed && (
                    <span className="text-teal-400 text-xs font-semibold uppercase tracking-widest">
                        Sections
                    </span>
                )}
            </div>

            <Separator className="bg-slate-700" />

            {/* Nav Buttons */}
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
                                            w-8 h-8 mx-auto
                                            ${isActive
                                                ? 'bg-teal-500 text-black'
                                                : 'bg-slate-700 text-slate-100 hover:bg-teal-300 hover:text-black'
                                            }
                                            shadow-sm shadow-black/10
                                        `}
                                    >
                                        <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-black' : 'bg-slate-100'}`} />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent side="right" className="bg-slate-800 text-slate-100 border-slate-700">
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
                                w-full justify-start text-sm font-medium
                                transition-colors duration-150
                                ${isActive
                                    ? 'bg-teal-500 text-black'
                                    : 'bg-slate-700 text-slate-100 hover:bg-teal-300 hover:text-black'
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
    )
}
