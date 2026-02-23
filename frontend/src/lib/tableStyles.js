// ── Shared Tailwind class strings for all data tables ─────────────────────────

// Dark header row
export const TABLE_HEADER = 'bg-brand-darkest text-brand-surface text-sm font-semibold'

// Row divider
export const ROW_BORDER = 'border-t border-brand-muted/15'

// Selected / active row (ring highlight)
export const ACTIVE_ROW = 'bg-brand-primary/15 ring-1 ring-inset ring-brand-primary/30'

// Hover for clickable rows
export const ROW_HOVER = 'hover:bg-brand-primary/5'

// Primary label text
export const ACTIVE_LABEL   = 'text-brand-primary'
export const INACTIVE_LABEL = 'text-brand-deep'

// Alternating row background (even = white, odd = light surface)
export function altRowBg(i) {
    return i % 2 === 0 ? 'bg-white' : 'bg-brand-surface/60'
}

// Full row background — active ring takes priority over alternating bg + hover
export function rowBg(i, isActive = false) {
    return isActive ? ACTIVE_ROW : `${altRowBg(i)} ${ROW_HOVER}`
}
