/**
 * SubSectionNav.jsx — Indented sub-tab list rendered below a sidebar section button.
 *
 * Shown inside SectionPanel when a section with sub-sections (Racial Polarization,
 * Ensemble Analysis) is active and its accordion is open.
 *
 * VISUAL DESIGN
 *   Indented with a left border line (border-brand-deep/50).
 *   Active tab gets a brand-primary left accent border and a faint bg highlight.
 *   Hidden entirely when the sidebar is collapsed (no room for labels).
 *
 * PROPS
 *   subsections  {Array<{id: string, label: string}>} — Sub-tab definitions to render.
 *   activeId     {string}                             — Currently active sub-section id.
 *   onSelect     {(id: string) => void}               — Called when a tab is clicked.
 *   collapsed    {boolean}                            — Returns null when true.
 */


/**
 * SubSectionNav — Indented vertical tab strip for section sub-navigation.
 *
 * @param {{
 *   subsections: Array<{ id: string, label: string }>,
 *   activeId:    string,
 *   onSelect:    (id: string) => void,
 *   collapsed:   boolean
 * }} props
 *   subsections — Array of sub-tab objects with id and display label.
 *   activeId    — The sub-section id currently in view (set by SectionPanel / scroll).
 *   onSelect    — Callback fired with the clicked sub-tab's id.
 *   collapsed   — When true the component returns null (sidebar is icon-only).
 * @returns {JSX.Element|null}
 */
export default function SubSectionNav({ subsections = [], activeId, onSelect, collapsed }) {

    /* ── Step 0: Guard — hidden in collapsed mode ─────────────────────────── */
    if (collapsed) return null


    /* ── Step 1: Render tab list ─────────────────────────────────────────── */
    return (
        <div className="ml-3 mt-1 flex flex-col border-l-2 border-brand-deep/50">
            {subsections.map(sub => {
                const isActive = sub.id === activeId
                return (
                    <button
                        key={sub.id}
                        onClick={() => onSelect(sub.id)}
                        className={[
                            'text-left pl-3 pr-2 py-1.5 text-xs font-semibold tracking-wide transition-colors duration-150',
                            isActive
                                /* Active: accent left border + faint teal background */
                                ? '-ml-[2px] border-l-2 border-brand-primary text-white bg-brand-primary/20'
                                /* Inactive: muted text, hover to full white */
                                : 'text-brand-surface/80 hover:text-white hover:bg-white/8',
                        ].join(' ')}
                    >
                        {sub.label}
                    </button>
                )
            })}
        </div>
    )
}
