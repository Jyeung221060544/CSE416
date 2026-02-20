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
                <LayoutList className="w-4 h-4 text-brand-surface shrink-0" />
                {!collapsed && (
                    <span className="text-brand-surface text-xs font-bold uppercase tracking-widest">
                        Sections
                    </span>
                )}
            </div>

            <Separator className="bg-brand-deep" />

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
                                                ? 'bg-brand-primary text-white'
                                                : 'bg-white/15 text-brand-surface hover:bg-white hover:text-black'
                                            }
                                            shadow-sm shadow-black/10
                                        `}
                                    >
                                        <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-white' : 'bg-brand-muted'}`} />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent side="right" className="bg-brand-darkest text-brand-surface border-brand-deep">
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
                                    ? 'bg-brand-primary text-white'
                                    : 'bg-white/15 text-brand-surface hover:bg-white hover:text-black'
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
