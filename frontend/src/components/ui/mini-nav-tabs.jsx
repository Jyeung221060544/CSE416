/**
 * MiniNavTabs.jsx — Reusable horizontal pill navigation bar.
 *
 * Designed to sit directly above a content panel, swapping its content
 * without any page-level scrolling. The active pill uses brand-primary;
 * inactive pills use a ghost style that comes alive on hover.
 *
 * Used in: StateOverviewSection (and future section panels).
 *
 * @param {{
 *   tabs:      Array<{ id: string, label: string }>,
 *   activeTab: string,
 *   onChange:  (id: string) => void,
 *   className?: string,
 * }} props
 *   tabs      — Ordered list of tab descriptors.
 *   activeTab — The id of the currently active tab.
 *   onChange  — Called with the new tab id when a pill is clicked.
 *   className — Extra Tailwind classes merged onto the wrapper (e.g. border-b spacing).
 */
export default function MiniNavTabs({ tabs, activeTab, onChange, className = '' }) {
    return (
        <div className={`flex items-center gap-1.5 flex-wrap ${className}`}>
            {tabs.map(tab => (
                <button
                    key={tab.id}
                    onClick={() => onChange(tab.id)}
                    className={[
                        'px-4 py-1.5 rounded-full text-xs font-semibold',
                        'transition-all duration-150 whitespace-nowrap cursor-pointer',
                        activeTab === tab.id
                            ? 'bg-brand-primary text-white shadow-sm'
                            : [
                                'text-brand-muted/80 border border-brand-muted/30',
                                'hover:border-brand-primary/50 hover:text-brand-darkest hover:bg-brand-primary/10',
                              ].join(' '),
                    ].join(' ')}
                >
                    {tab.label}
                </button>
            ))}
        </div>
    )
}
