

import { useState } from 'react'
import { LayoutList, ChevronDown, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import SubSectionNav from '@/components/ui/sub-section-nav'
import useAppStore from '../store/useAppStore'

const SECTIONS = [
    { id: 'state-overview',          label: 'State Overview' },
    { id: 'demographic',             label: 'Demographic Data' },
    { id: 'racial-polarization',     label: 'Racial Polarization' },
    { id: 'ensemble-analysis',       label: 'Ensemble Analysis' },
    { id: 'effectiveness-analysis',  label: 'Effectiveness Analysis' },
    { id: 'representation-gap',      label: 'Representation Gap' },
]

const SO_SUBSECTIONS = [
    { id: 'state-stats',   label: 'State Summary'          },
    { id: 'congressional', label: 'Congressional Districts' },
    { id: 'ensemble-demo', label: 'Ensemble & Demographic'  },
]

const RP_SUBSECTIONS = [
    { id: 'gingles', label: 'Gingles Analysis'        },
    { id: 'ei-kde',  label: 'Ecological Inference KDE' },
    { id: 'ei-bar',  label: 'EI Bar & Polarization'    },
]

const EA_SUBSECTIONS = [
    { id: 'ensemble-splits', label: 'Ensemble Splits' },
    { id: 'box-whisker',     label: 'Box & Whisker'   },
]

const EFF_SUBSECTIONS = [
    { id: 'effectiveness-visualizations', label: 'Effectiveness Visualizations' },
    { id: 'vra-impact',                   label: 'VRA Impact'                   },
]


/**
 * SectionPanel — Sidebar navigation with collapsible sub-section tabs.
 *
 * @param {{ collapsed: boolean }} props
 *   collapsed — When true the panel renders icon-only dot buttons with tooltips.
 *               Forwarded from Sidebar's local collapsed state.
 * @returns {JSX.Element}
 */
export default function SectionPanel({ collapsed }) {
    const { activeSection, setActiveSection,
            activeSOTab, setActiveSOTab,
            activeRPTab, setActiveRPTab,
            activeEATab, setActiveEATab,
            activeEFFTab, setActiveEFFTab } = useAppStore()

    const [expandedSection, setExpandedSection] = useState('state-overview')

    const toggleExpand = (id) => setExpandedSection(prev => prev === id ? null : id)

    const activateSOTab  = (tabId) => { setActiveSOTab(tabId);  setActiveSection('state-overview') }
    const activateRPTab  = (tabId) => { setActiveRPTab(tabId);  setActiveSection('racial-polarization') }
    const activateEATab  = (tabId) => { setActiveEATab(tabId);  setActiveSection('ensemble-analysis') }
    const activateEFFTab = (tabId) => { setActiveEFFTab(tabId); setActiveSection('effectiveness-analysis') }

    const handleSOClick  = () => { setActiveSection('state-overview');         toggleExpand('state-overview') }
    const handleRPClick  = () => { setActiveSection('racial-polarization');    toggleExpand('racial-polarization') }
    const handleEAClick  = () => { setActiveSection('ensemble-analysis');      toggleExpand('ensemble-analysis') }
    const handleEFFClick = () => { setActiveSection('effectiveness-analysis'); toggleExpand('effectiveness-analysis') }


    return (
        <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 px-1">
                <LayoutList className="w-4 h-4 text-brand-surface shrink-0" />
                {!collapsed && (
                    <span className="text-brand-surface text-sm font-bold tracking-widest">
                        Sections
                    </span>
                )}
            </div>

            <Separator className="bg-brand-deep" />
            <div className="flex flex-col gap-1 px-1">
                {SECTIONS.map((section) => {
                    const isActive  = activeSection === section.id
                    const isSO      = section.id === 'state-overview'
                    const isRP      = section.id === 'racial-polarization'
                    const isEA      = section.id === 'ensemble-analysis'
                    const isEFF     = section.id === 'effectiveness-analysis'
                    const hasSubNav = isSO || isRP || isEA || isEFF

                    const handleClick = isSO  ? handleSOClick
                                      : isRP  ? handleRPClick
                                      : isEA  ? handleEAClick
                                      : isEFF ? handleEFFClick
                                      : () => { setActiveSection(section.id); setExpandedSection(null) }

                    const subNavOpen     = expandedSection === section.id
                    const subsections    = isSO  ? SO_SUBSECTIONS
                                        : isRP  ? RP_SUBSECTIONS
                                        : isEA  ? EA_SUBSECTIONS
                                        : EFF_SUBSECTIONS
                    const subNavActiveId = isSO  ? activeSOTab
                                        : isRP  ? activeRPTab
                                        : isEA  ? activeEATab
                                        : activeEFFTab
                    const subNavOnSelect = isSO  ? activateSOTab
                                        : isRP  ? activateRPTab
                                        : isEA  ? activateEATab
                                        : activateEFFTab

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
                                        <TooltipContent side="right" className="z-[1001] bg-brand-darkest text-brand-surface border-brand-deep">
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

                                    {hasSubNav && !collapsed && (
                                        subNavOpen
                                            ? <ChevronDown className="w-3.5 h-3.5 opacity-70 shrink-0" />
                                            : <ChevronRight className="w-3.5 h-3.5 opacity-70 shrink-0" />
                                    )}
                                </Button>
                            )}

                            {hasSubNav && subNavOpen && (
                                <SubSectionNav
                                    subsections={subsections}
                                    activeId={subNavActiveId}
                                    onSelect={subNavOnSelect}
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
