import { useState } from 'react'
import { LayoutList, ChevronDown, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import SubSectionNav from '@/components/ui/sub-section-nav'
import useAppStore from '../store/useAppStore'
import { lockScroll } from '../utils/scrollLock'

const SECTIONS = [
    { id: 'state-overview',      label: 'State Overview' },
    { id: 'demographic',         label: 'Demographic Data' },
    { id: 'racial-polarization', label: 'Racial Polarization' },
    { id: 'ensemble-analysis',   label: 'Ensemble Analysis' },
]

const RP_SUBSECTIONS = [
    { id: 'gingles-analysis',     label: 'Gingles Analysis' },
    { id: 'ecological-inference', label: 'Ecological Inference' },
]

const EA_SUBSECTIONS = [
    { id: 'ensemble-splits', label: 'Ensemble Splits' },
    { id: 'box-whisker',     label: 'Box & Whisker' },
]

export default function SectionPanel({ collapsed }) {
    const { activeSection, setActiveSection, activeSubSection, setActiveSubSection } = useAppStore()
    const [subOpen,   setSubOpen]   = useState(true)
    const [subOpenEA, setSubOpenEA] = useState(true)

    const scrollToSection = (id) => {
        lockScroll()
        setActiveSection(id)
        const el = document.getElementById(id)
        if (el) el.scrollIntoView({ behavior: 'smooth' })
    }

    const scrollToSubSection = (id, parentId) => {
        lockScroll()
        setActiveSubSection(id)
        setActiveSection(parentId)
        const el = document.getElementById(id)
        if (el) el.scrollIntoView({ behavior: 'smooth' })
    }

    const handleRPClick = () => {
        if (activeSection === 'racial-polarization') {
            setSubOpen(o => !o)
        } else {
            setSubOpen(true)
            scrollToSection('racial-polarization')
        }
    }

    const handleEAClick = () => {
        if (activeSection === 'ensemble-analysis') {
            setSubOpenEA(o => !o)
        } else {
            setSubOpenEA(true)
            scrollToSection('ensemble-analysis')
        }
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
            <div className="flex flex-col gap-1 px-1">
                {SECTIONS.map((section) => {
                    const isActive = activeSection === section.id
                    const isRP = section.id === 'racial-polarization'
                    const isEA = section.id === 'ensemble-analysis'
                    const hasSubNav = isRP || isEA

                    const handleClick = isRP ? handleRPClick : isEA ? handleEAClick : () => scrollToSection(section.id)
                    const subNavOpen  = isRP ? subOpen : subOpenEA
                    const subsections = isRP ? RP_SUBSECTIONS : EA_SUBSECTIONS
                    const parentId    = isRP ? 'racial-polarization' : 'ensemble-analysis'

                    return (
                        <div key={section.id}>
                            {collapsed ? (
                                <TooltipProvider delayDuration={100}>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={handleClick}
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
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleClick}
                                    className={`
                                        w-full justify-between text-sm font-medium
                                        transition-colors duration-150
                                        ${isActive
                                            ? 'bg-brand-primary text-white'
                                            : 'bg-white/15 text-brand-surface hover:bg-white hover:text-black'
                                        }
                                        shadow-sm shadow-black/10
                                    `}
                                >
                                    <span>{section.label}</span>
                                    {/* Chevron for sections with subsections */}
                                    {hasSubNav && !collapsed && (
                                        subNavOpen && isActive
                                            ? <ChevronDown className="w-3.5 h-3.5 opacity-70 shrink-0" />
                                            : <ChevronRight className="w-3.5 h-3.5 opacity-70 shrink-0" />
                                    )}
                                </Button>
                            )}

                            {/* Sub-section tabs */}
                            {hasSubNav && isActive && subNavOpen && (
                                <SubSectionNav
                                    subsections={subsections}
                                    activeId={activeSubSection}
                                    onSelect={(id) => scrollToSubSection(id, parentId)}
                                    collapsed={collapsed}
                                />
                            )}
                        </div>
                    )
                })}
            </div>

        </div>
    )
}
