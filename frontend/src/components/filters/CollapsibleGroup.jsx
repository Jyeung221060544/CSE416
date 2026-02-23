/**
 * CollapsibleGroup.jsx — Accordion wrapper used by every sidebar filter group.
 *
 * Renders a labeled toggle button above a collapsible content area.
 * Defaults to open (expanded) on mount.
 *
 * PROPS
 *   label    {string}    — Header text shown in the toggle button (e.g. "Race / Ethnicity").
 *   children {ReactNode} — Filter controls (radio buttons, checkboxes) rendered inside.
 *
 * USAGE
 *   <CollapsibleGroup label="Granularity">
 *     <input type="radio" ... />
 *   </CollapsibleGroup>
 */

import { useState } from 'react'
import { ChevronUp, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'


/**
 * CollapsibleGroup — Accordion header + collapsible content area for filter panels.
 *
 * @param {{ label: string, children: ReactNode }} props
 *   label    — Uppercase section label shown on the toggle button.
 *   children — Filter input elements rendered when the group is open.
 * @returns {JSX.Element}
 */
export default function CollapsibleGroup({ label, children }) {

    /* ── Step 0: Local open/closed state (defaults open) ─────────────────── */
    const [open, setOpen] = useState(true)


    /* ── Step 1: Render ──────────────────────────────────────────────────── */
    return (
        <div className="flex flex-col gap-1.5">

            {/* ── TOGGLE BUTTON ────────────────────────────────────────────── */}
            {/* Clicking toggles the accordion; chevron icon reflects current state */}
            <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setOpen(!open)}
                className="justify-between px-1 w-full text-brand-surface hover:bg-white/10 hover:text-brand-surface"
            >
                <span className="text-brand-surface text-xs uppercase tracking-wider">{label}</span>
                {open
                    ? <ChevronUp   className="w-3 h-3 text-brand-surface" />
                    : <ChevronDown className="w-3 h-3 text-brand-surface" />
                }
            </Button>

            {/* ── CONTENT AREA ─────────────────────────────────────────────── */}
            {/* Hidden entirely when closed — no animation needed */}
            {open && <div className="flex flex-col">{children}</div>}

        </div>
    )
}
