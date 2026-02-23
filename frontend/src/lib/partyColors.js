// ── Political party hex colors (for SVG/Nivo charts) ──────────────────────────
export const DEM_COLOR     = '#3b82f6'   // blue-500
export const DEM_DARK      = '#1d4ed8'   // blue-700
export const REP_COLOR     = '#ef4444'   // red-500
export const REP_DARK      = '#b91c1c'   // red-700
export const TIE_COLOR     = '#a855f7'   // purple-500
export const ENACTED_COLOR = '#595a96'   // amber-500
export const THRESH_COLOR  = '#94a3b8'   // slate-400  (threshold lines, neutral elements)

// ── Party Tailwind classes (badges, text on light/dark backgrounds) ────────────
export const PARTY_BADGE = {
    Democratic: 'bg-blue-50 text-blue-700 border-blue-200',
    Republican: 'bg-red-50 text-red-700 border-red-200',
}

export const DEM_TEXT        = 'text-blue-600'   // vote values on light bg
export const REP_TEXT        = 'text-red-600'
export const DEM_HEADER_TEXT = 'text-blue-300'   // column headers on dark bg
export const REP_HEADER_TEXT = 'text-red-300'

// ── Political outcome badge classes (GinglesSummaryTable) ─────────────────────
export function getOutcome(dem) {
    const d = dem * 100
    if (d >= 65) return { label: 'Dem-Won',   cls: 'bg-blue-50 text-blue-700 border-blue-200' }
    if (d >= 52) return { label: 'Lean Dem',  cls: 'bg-blue-50/60 text-blue-600 border-blue-100' }
    if (d >= 48) return { label: 'Contested', cls: 'bg-slate-50 text-slate-500 border-slate-200' }
    if (d >= 35) return { label: 'Lean Rep',  cls: 'bg-red-50/60 text-red-600 border-red-100' }
    return           { label: 'Rep-Won',   cls: 'bg-red-50 text-red-700 border-red-200' }
}

// ── Feasibility badge classes ──────────────────────────────────────────────────
export const FEASIBLE_CLS     = 'bg-emerald-50 text-emerald-700 border-emerald-200 text-xs font-semibold px-2 py-0.5'
export const NOT_FEASIBLE_CLS = 'bg-red-50 text-red-500 border-red-200 text-xs font-semibold px-2 py-0.5'

// ── Region type badge classes (GinglesPrecinctTable) ──────────────────────────
export const REGION_CLS = {
    urban:    'bg-purple-50 text-purple-700 border-purple-200',
    suburban: 'bg-sky-50 text-sky-700 border-sky-200',
    rural:    'bg-amber-50 text-amber-700 border-amber-200',
}

// ── Ecological Inference race palette ─────────────────────────────────────────
export const RACE_COLORS = {
    black:    '#6366f1',   // indigo-500
    white:    '#e90eb6',   // sky-500
    hispanic: '#f59e0b',   // amber-500
    asian:    '#10b981',   // emerald-500
    other:    '#a855f7',   // purple-500
}

export const RACE_LABELS = {
    black:    'Black',
    white:    'White',
    hispanic: 'Hispanic',
    asian:    'Asian',
    other:    'Other',
}

// ── Chart axis / label UI colors (shared across all Nivo charts) ──────────────
export const AXIS_COLOR  = '#64748b'   // slate-500
export const LABEL_COLOR = '#334155'   // slate-700
