/**
 * SubSectionNav — reusable indented sub-tabs for a sidebar section.
 *
 * The parent section pill controls open/close. This component only
 * renders the tab list itself.
 *
 * Props:
 *   subsections  [{id: string, label: string}]
 *   activeId     string   — currently active sub-section id
 *   onSelect     (id) => void
 *   collapsed    boolean  — sidebar collapsed state (hides when true)
 */
export default function SubSectionNav({ subsections = [], activeId, onSelect, collapsed }) {
    if (collapsed) return null

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
                                ? '-ml-[2px] border-l-2 border-brand-primary text-white bg-brand-primary/20'
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
