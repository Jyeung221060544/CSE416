/**
 * Sidebar.jsx — Collapsible left navigation panel on StatePage.
 *
 * Contains two areas stacked vertically inside a ScrollArea:
 *   1. SectionPanel  — nav buttons to jump between page sections
 *   2. FilterPanel   — context-sensitive filters for the active section
 *
 * COLLAPSED STATE
 *   When collapsed=true the sidebar shrinks to w-14 (icon-only mode).
 *   SectionPanel shows tooltip-wrapped dot buttons instead of labeled buttons.
 *   FilterPanel is hidden entirely (no space to render labels).
 *   The toggle button sits on the right edge of the sidebar as an absolute pill.
 *
 * PROPS: none — collapsed state is local to this component.
 */

import { useState } from 'react'
import { ChevronLeft, ChevronRight, SlidersHorizontal } from 'lucide-react'
import { Button }     from '@/components/ui/button'
import { Separator }  from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import FilterPanel    from './FilterPanel'
import SectionPanel   from './SectionPanel'

// Tailwind override: force all Lucide icons in this sidebar to 16×16 px
const iconSize = "[&_svg]:!w-4 [&_svg]:!h-4"

/**
 * Sidebar — Collapsible left panel with section nav and local filters.
 *
 * @returns {JSX.Element}
 */
export default function Sidebar() {

    /* ── Step 0: Local collapse state ────────────────────────────────────── */
    const [collapsed, setCollapsed] = useState(false)


    /* ── Step 1: Render ──────────────────────────────────────────────────── */
    return (
        <aside
            className={`
                relative flex flex-col h-full bg-brand-darkest border-r border-brand-deep
                transition-all duration-300 ease-in-out shrink-0
                ${collapsed ? 'w-14' : 'w-64'}
            `}
        >

            {/* ── COLLAPSE TOGGLE ─────────────────────────────────────────── */}
            {/* Pill button that sits on the right edge of the sidebar.
                Clicking it toggles the collapsed state and changes the icon. */}
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

            {/* ── SCROLLABLE CONTENT ──────────────────────────────────────── */}
            {/* ScrollArea prevents the sidebar from pushing page layout when
                the filter list is taller than the viewport. */}
            <ScrollArea className="flex-1 overflow-hidden">
                <div className="flex flex-col gap-6 py-5 px-3">

                    {/* ── SECTIONS NAV ────────────────────────────────────── */}
                    {/* Buttons to jump to each page section; collapses to dots */}
                    <SectionPanel collapsed={collapsed} />

                    {/* ── LOCAL FILTERS ───────────────────────────────────── */}
                    <div className="flex flex-col gap-2">

                        {/* Section header row — icon always visible, label hides when collapsed */}
                        <div className="flex items-center gap-2 px-1">
                            <SlidersHorizontal className="w-4 h-4 text-brand-surface shrink-0" />
                            {!collapsed && (
                                <span className="text-brand-surface text-xs font-bold uppercase tracking-widest">
                                    Local Filters
                                </span>
                            )}
                        </div>

                        <Separator className="bg-brand-deep" />

                        {/* FilterPanel — hidden entirely when collapsed (no labels visible) */}
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
