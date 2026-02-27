/**
 * BrowserTabs.jsx — Browser/folder-tab style navigation container.
 *
 * VISUAL DESIGN
 *   ┌──────────────┐  ┌────────────────────┐
 *   │  Inactive    │  │  Active Tab (↑up)  │
 *   └──────────────┘  └────────────────────────────────────────────┐
 *   ░░░░░░░░░░░░░ light lavender content panel ░░░░░░░░░░░░░░░░░░░░│
 *   │  {children}                                                   │
 *   └───────────────────────────────────────────────────────────────┘
 *
 * The classic browser-tab trick:
 *   · Tab bar has `border-bottom: 2px solid BORDER` (the "shelf")
 *   · Active tab has `border-bottom-color: PANEL_BG` + `margin-bottom: -2px`
 *     so its bottom border erases the shelf below it — the tab looks open
 *   · Panel has `border: 2px solid BORDER`, `border-top: none`
 *   · Result: active tab appears "attached" to the panel below
 *
 * PROPS
 *   tabs         {Array<{ id: string, label: string }>} — Tab descriptors.
 *   activeTab    {string}  — Id of the currently active tab.
 *   onChange     {function} — Called with new tab id on click.
 *   children     {ReactNode} — Content rendered inside the panel.
 *   className    {string}   — Extra classes on the outer wrapper.
 *   panelClassName {string} — Extra classes on the content panel div.
 *                             Use to control padding / height / overflow.
 */

/* ── Color tokens ────────────────────────────────────────────────────────── */

const PANEL_BG        = '#f4f1ff'   // light lavender — panel bg + active tab bg
const BORDER          = 'rgba(89,90,150,0.55)'   // brand-primary ~55% — shelf + panel border
const INACTIVE_BG     = '#ddd7f5'   // muted lavender — inactive tab bg
const INACTIVE_BORDER = '#8f87c0'   // muted purple   — inactive tab border
const ACTIVE_TEXT     = '#2e2a6e'   // deep brand     — active tab label
const INACTIVE_TEXT   = '#6b64a0'   // muted brand    — inactive tab label
const HOVER_BG        = '#ece7ff'   // hover lavender — inactive tab hover bg


/**
 * BrowserTabs — Folder-tab navigation component.
 *
 * @param {{
 *   tabs:           Array<{ id: string, label: string }>,
 *   activeTab:      string,
 *   onChange:       (id: string) => void,
 *   children:       React.ReactNode,
 *   className?:     string,
 *   panelClassName?: string,
 * }} props
 * @returns {JSX.Element}
 */
export default function BrowserTabs({
    tabs,
    activeTab,
    onChange,
    children,
    className    = '',
    panelClassName = '',
}) {
    return (
        <div className={className}>

            {/* ── TAB BAR (the "shelf") ────────────────────────────────────── */}
            {/* border-bottom forms the visible shelf line.                     */}
            {/* Active tab pierces this line via margin-bottom: -2px.           */}
            <div
                style={{
                    display: 'flex',
                    alignItems: 'flex-end',
                    gap: '3px',
                    borderBottom: `2px solid ${BORDER}`,
                    paddingLeft: '2px',
                }}
            >
                {tabs.map(tab => {
                    const isActive = tab.id === activeTab
                    return (
                        <button
                            key={tab.id}
                            onClick={() => onChange(tab.id)}
                            style={{
                                /* Shape */
                                borderRadius: '8px 8px 0 0',
                                padding: isActive ? '8px 22px 9px' : '6px 20px 7px',

                                /* Border — active tab opens at bottom to connect with panel */
                                border: `2px solid ${isActive ? BORDER : INACTIVE_BORDER}`,
                                borderBottom: isActive
                                    ? `2px solid ${PANEL_BG}`   /* "erases" shelf under active tab */
                                    : `2px solid ${INACTIVE_BORDER}`,

                                /* Color */
                                background: isActive ? PANEL_BG : INACTIVE_BG,
                                color: isActive ? ACTIVE_TEXT : INACTIVE_TEXT,

                                /* Stacking — active tab must sit above the shelf */
                                marginBottom: isActive ? '-2px' : '0',
                                position: 'relative',
                                zIndex: isActive ? 2 : 1,

                                /* Typography */
                                fontSize: 12,
                                fontWeight: 700,
                                letterSpacing: '0.02em',
                                whiteSpace: 'nowrap',
                                cursor: 'pointer',
                                transition: 'background 120ms, color 120ms, box-shadow 120ms',

                                /* Subtle shadow lift on active tab */
                                boxShadow: isActive
                                    ? '0 -3px 8px rgba(89,90,150,0.15)'
                                    : 'none',
                            }}
                            onMouseEnter={e => {
                                if (!isActive) e.currentTarget.style.background = HOVER_BG
                            }}
                            onMouseLeave={e => {
                                if (!isActive) e.currentTarget.style.background = INACTIVE_BG
                            }}
                        >
                            {tab.label}
                        </button>
                    )
                })}
            </div>

            {/* ── CONTENT PANEL ────────────────────────────────────────────── */}
            {/* border-top: none — the shelf line above serves as the visual top */}
            {/* border-radius 0 0 12px 12px — rounded bottom corners only        */}
            <div
                style={{
                    background: PANEL_BG,
                    border: `2px solid ${BORDER}`,
                    borderTop: 'none',
                    borderRadius: '0 0 12px 12px',
                    position: 'relative',
                    zIndex: 1,
                    boxShadow: '0 4px 16px rgba(89,90,150,0.10)',
                }}
                className={panelClassName}
            >
                {children}
            </div>

        </div>
    )
}
