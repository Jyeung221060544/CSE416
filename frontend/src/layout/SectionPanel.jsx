/**
 * SectionPanel.jsx — Sidebar navigation panel for jumping between page sections.
 *
 * SECTION STRUCTURE
 *   SECTIONS          — top-level sections rendered as nav buttons (always visible).
 *   RP_SUBSECTIONS    — sub-tabs shown inside the Racial Polarization button when active.
 *   EA_SUBSECTIONS    — sub-tabs shown inside the Ensemble Analysis button when active.
 *
 * COLLAPSED STATE
 *   When collapsed=true (passed from Sidebar), buttons shrink to icon-only dots
 *   wrapped in Shadcn Tooltips so the label is still discoverable on hover.
 *   Sub-section tabs (SubSectionNav) are hidden when collapsed.
 *
 * NAV BEHAVIOR
 *   Clicking a section button:
 *     • If that section is NOT active → smooth-scroll to it and mark it active.
 *     • If that section IS active and it has sub-sections → toggle the sub-nav open/closed.
 *   scrollLock() is called before every scroll so useActiveSection's scroll listener
 *   doesn't fight the programmatic navigation.
 *
 * PROPS
 *   collapsed {boolean} — Forwarded from Sidebar; true = icon-only mode.
 */

import { useState } from 'react'
import { LayoutList, ChevronDown, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import SubSectionNav from '@/components/ui/sub-section-nav'
import useAppStore from '../store/useAppStore'
import { lockScroll } from '../utils/scrollLock'


/* ── Step 0: Section + sub-section data ──────────────────────────────────────
 *
 * SECTIONS is the ordered list rendered as nav buttons.
 * RP_SUBSECTIONS / EA_SUBSECTIONS appear as collapsible tabs beneath their
 * parent button when that section is active.
 * ─────────────────────────────────────────────────────────────────────────── */
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


/**
 * SectionPanel — Sidebar navigation with collapsible sub-section tabs.
 *
 * @param {{ collapsed: boolean }} props
 *   collapsed — When true the panel renders icon-only dot buttons with tooltips.
 *               Forwarded from Sidebar's local collapsed state.
 * @returns {JSX.Element}
 */
export default function SectionPanel({ collapsed }) {

    /* ── Step 1: Global state + local accordion state ────────────────────── */

    // activeSection / activeSubSection — from Zustand; updated on scroll or click
    // setActiveSection / setActiveSubSection — Zustand actions; called on click
    const { activeSection, setActiveSection, activeSubSection, setActiveSubSection } = useAppStore()

    // subOpen    — controls whether RP sub-nav is expanded (local UI state only)
    // subOpenEA  — controls whether EA sub-nav is expanded (local UI state only)
    const [subOpen,   setSubOpen]   = useState(true)
    const [subOpenEA, setSubOpenEA] = useState(true)


    /* ── Step 2: Navigation helpers ──────────────────────────────────────── */

    /**
     * scrollToSection — Smooth-scrolls the viewport to a top-level section.
     *
     * Calls lockScroll() first so that the IntersectionObserver in useActiveSection
     * does not immediately overwrite the section we are navigating to.
     *
     * @param {string} id  The DOM element id of the target section (e.g. 'demographic').
     *                     Must match the id= prop on the corresponding section wrapper div.
     */
    const scrollToSection = (id) => {
        lockScroll()
        setActiveSection(id)
        const el = document.getElementById(id)
        if (el) el.scrollIntoView({ behavior: 'smooth' })
    }

    /**
     * scrollToSubSection — Smooth-scrolls to a sub-section inside a parent section.
     *
     * Sets both activeSubSection (e.g. 'gingles-analysis') and activeSection
     * (the parent, e.g. 'racial-polarization') so the sidebar highlight stays
     * consistent with the scrolled position.
     *
     * @param {string} id        DOM id of the sub-section element to scroll to.
     * @param {string} parentId  DOM id of the parent section (used to keep the parent active).
     */
    const scrollToSubSection = (id, parentId) => {
        lockScroll()
        setActiveSubSection(id)
        setActiveSection(parentId)
        const el = document.getElementById(id)
        if (el) el.scrollIntoView({ behavior: 'smooth' })
    }

    /**
     * handleRPClick — Click handler for the Racial Polarization nav button.
     *
     * Two behaviors:
     *   • Already active  → toggle RP sub-nav accordion open/closed.
     *   • Not active      → expand sub-nav and scroll to the section.
     */
    const handleRPClick = () => {
        if (activeSection === 'racial-polarization') {
            setSubOpen(o => !o)
        } else {
            setSubOpen(true)
            scrollToSection('racial-polarization')
        }
    }

    /**
     * handleEAClick — Click handler for the Ensemble Analysis nav button.
     *
     * Two behaviors:
     *   • Already active  → toggle EA sub-nav accordion open/closed.
     *   • Not active      → expand sub-nav and scroll to the section.
     */
    const handleEAClick = () => {
        if (activeSection === 'ensemble-analysis') {
            setSubOpenEA(o => !o)
        } else {
            setSubOpenEA(true)
            scrollToSection('ensemble-analysis')
        }
    }


    /* ── Step 3: Render ──────────────────────────────────────────────────── */
    return (
        <div className="flex flex-col gap-2">

            {/* ── HEADER ───────────────────────────────────────────────────── */}
            {/* Icon always visible; "Sections" label hidden when sidebar is collapsed */}
            <div className="flex items-center gap-2 px-1">
                <LayoutList className="w-4 h-4 text-brand-surface shrink-0" />
                {!collapsed && (
                    <span className="text-brand-surface text-xs font-bold uppercase tracking-widest">
                        Sections
                    </span>
                )}
            </div>

            <Separator className="bg-brand-deep" />

            {/* ── NAV BUTTONS ──────────────────────────────────────────────── */}
            {/* Each section in SECTIONS gets one button.
                Active section is highlighted with brand-primary background.
                Sections with sub-nav (RP, EA) show a chevron indicator. */}
            <div className="flex flex-col gap-1 px-1">
                {SECTIONS.map((section) => {

                    /* Per-section derived flags */
                    const isActive  = activeSection === section.id
                    const isRP      = section.id === 'racial-polarization'
                    const isEA      = section.id === 'ensemble-analysis'
                    const hasSubNav = isRP || isEA

                    /* Route click to the correct handler */
                    const handleClick = isRP ? handleRPClick
                                      : isEA ? handleEAClick
                                      : () => scrollToSection(section.id)

                    /* Which sub-nav state / items belong to this section */
                    const subNavOpen  = isRP ? subOpen : subOpenEA
                    const subsections = isRP ? RP_SUBSECTIONS : EA_SUBSECTIONS
                    const parentId    = isRP ? 'racial-polarization' : 'ensemble-analysis'

                    return (
                        <div key={section.id}>

                            {/* ── COLLAPSED MODE: dot button + tooltip ─────── */}
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
                                                {/* Dot indicator replaces text label */}
                                                <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-white' : 'bg-brand-muted'}`} />
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent side="right" className="bg-brand-darkest text-brand-surface border-brand-deep">
                                            {section.label}
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            ) : (

                                /* ── EXPANDED MODE: full-width labeled button ─ */
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

                                    {/* Chevron for sections that have sub-sections */}
                                    {hasSubNav && !collapsed && (
                                        subNavOpen && isActive
                                            ? <ChevronDown className="w-3.5 h-3.5 opacity-70 shrink-0" />
                                            : <ChevronRight className="w-3.5 h-3.5 opacity-70 shrink-0" />
                                    )}
                                </Button>
                            )}

                            {/* ── SUB-SECTION TABS ─────────────────────────── */}
                            {/* Only rendered when this section is active and sub-nav is open.
                                SubSectionNav renders the Gingles/EI or Splits/BoxWhisker tabs. */}
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
