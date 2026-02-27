/**
 * SectionPanel.jsx — Sidebar navigation panel for jumping between page sections.
 *
 * SECTION STRUCTURE
 *   SECTIONS        — top-level sections rendered as nav buttons (always visible).
 *   SO_SUBSECTIONS  — tab items shown under State Overview when it is active.
 *   RP_SUBSECTIONS  — tab items shown under Racial Polarization when it is active.
 *   EA_SUBSECTIONS  — scroll sub-sections shown under Ensemble Analysis when active.
 *
 * SUB-NAV BEHAVIOR
 *   State Overview sub-items  → call setActiveSOTab() + scroll to section.
 *   Racial Polarization items → call setActiveRPTab() + scroll to section.
 *   Ensemble Analysis items   → scroll to the sub-section DOM element (scroll-based).
 *   The active highlight for SO/RP reflects the current tab store value so the
 *   sidebar always mirrors the mini-nav pills in the page sections.
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
 * SECTIONS        — ordered list of top-level nav buttons.
 * SO_SUBSECTIONS  — tab ids match OVERVIEW_TABS in StateOverviewSection; clicking
 *                   one calls setActiveSOTab() rather than scrolling to a DOM id.
 * RP_SUBSECTIONS  — tab ids match RP_TABS in RacialPolarizationSection; clicking
 *                   one calls setActiveRPTab() rather than scrolling to a DOM id.
 * EA_SUBSECTIONS  — DOM ids used for scroll-based navigation inside the section.
 * ─────────────────────────────────────────────────────────────────────────── */
const SECTIONS = [
    { id: 'state-overview',      label: 'State Overview' },
    { id: 'demographic',         label: 'Demographic Data' },
    { id: 'racial-polarization', label: 'Racial Polarization' },
    { id: 'ensemble-analysis',   label: 'Ensemble Analysis' },
]

const SO_SUBSECTIONS = [
    { id: 'state-stats',   label: 'State Summary'          },
    { id: 'congressional', label: 'Congressional Districts' },
    { id: 'ensemble-demo', label: 'Ensemble & Demographic'  },
]

const RP_SUBSECTIONS = [
    { id: 'gingles', label: 'Gingles Analysis'        },
    { id: 'ei-kde',  label: 'Ecological Inference KDE' },
    { id: 'ei-bar',  label: 'Ecological Inference Bar' },
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

    // activeSection  — updated by scroll detection and nav clicks.
    // activeSOTab / activeRPTab / activeEATab — updated by sub-nav clicks and section pills.
    const { activeSection, setActiveSection,
            activeSOTab, setActiveSOTab,
            activeRPTab, setActiveRPTab,
            activeEATab, setActiveEATab } = useAppStore()

    // subOpen{SO,RP,EA} — controls whether each sub-nav accordion is open (local UI only)
    const [subOpenSO, setSubOpenSO] = useState(true)
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
     * activateSOTab — Activates a State Overview tab and scrolls to the section.
     * Called when the user clicks a sub-item in the SO sub-nav.
     */
    const activateSOTab = (tabId) => {
        setActiveSOTab(tabId)
        scrollToSection('state-overview')
    }

    /**
     * activateRPTab — Activates a Racial Polarization tab and scrolls to the section.
     * Called when the user clicks a sub-item in the RP sub-nav.
     */
    const activateRPTab = (tabId) => {
        setActiveRPTab(tabId)
        scrollToSection('racial-polarization')
    }

    /**
     * activateEATab — Activates an Ensemble Analysis tab and scrolls to the section.
     * Called when the user clicks a sub-item in the EA sub-nav.
     */
    const activateEATab = (tabId) => {
        setActiveEATab(tabId)
        scrollToSection('ensemble-analysis')
    }

    /**
     * handleSOClick — Click handler for the State Overview nav button.
     *
     * Two behaviors:
     *   • Already active  → toggle SO sub-nav accordion open/closed.
     *   • Not active      → expand sub-nav and scroll to the section.
     */
    const handleSOClick = () => {
        if (activeSection === 'state-overview') {
            setSubOpenSO(o => !o)
        } else {
            setSubOpenSO(true)
            scrollToSection('state-overview')
        }
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
                    const isSO      = section.id === 'state-overview'
                    const isRP      = section.id === 'racial-polarization'
                    const isEA      = section.id === 'ensemble-analysis'
                    const hasSubNav = isSO || isRP || isEA

                    /* Route click to the correct handler */
                    const handleClick = isSO ? handleSOClick
                                      : isRP ? handleRPClick
                                      : isEA ? handleEAClick
                                      : () => scrollToSection(section.id)

                    /* Which sub-nav state / items / active id / select handler belong to this section */
                    const subNavOpen     = isSO ? subOpenSO : isRP ? subOpen : subOpenEA
                    const subsections    = isSO ? SO_SUBSECTIONS : isRP ? RP_SUBSECTIONS : EA_SUBSECTIONS
                    const subNavActiveId = isSO ? activeSOTab : isRP ? activeRPTab : activeEATab
                    const subNavOnSelect = isSO ? activateSOTab
                                        : isRP ? activateRPTab
                                        : activateEATab

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
                                        <TooltipContent side="right" className="z-[1001] bg-brand-darkest text-brand-surface border-brand-deep">
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
