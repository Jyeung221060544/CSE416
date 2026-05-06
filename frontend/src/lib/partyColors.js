export const DEM_COLOR     = '#3b82f6'   // blue-500
export const DEM_DARK      = '#1d4ed8'   // blue-700
export const REP_COLOR     = '#ef4444'   // red-500
export const REP_DARK      = '#b91c1c'   // red-700
export const TIE_COLOR          = '#a855f7'   // purple-500
export const ENACTED_COLOR      = '#595a96'   // brand-primary
export const THRESH_COLOR       = '#94a3b8'   // slate-400
export const COMPARE_RB_COLOR   = '#31e2a1'   // Race-Blind bars in compare view
export const COMPARE_VRA_COLOR  = '#ea8e24'   // VRA-Constrained bars in compare view

export const PARTY_BADGE = {
    Democratic: 'bg-blue-50 text-blue-700 border-blue-200',
    Republican:  'bg-red-50 text-red-700 border-red-200',
}

export const DEM_TEXT        = 'text-blue-600'
export const REP_TEXT        = 'text-red-600'
export const DEM_HEADER_TEXT = 'text-blue-300'
export const REP_HEADER_TEXT = 'text-red-300'


/**
 * Maps Democratic vote share to an outcome label + badge class.
 *
 * Thresholds: >= 65% Dem-Won · >= 52% Lean Dem · >= 48% Contested · >= 35% Lean Rep · else Rep-Won
 *
 * @param  {number} dem  Democratic vote share as a decimal 0.0–1.0.
 * @returns {{ label: string, cls: string }}
 */
export function getOutcome(dem) {
    const d = dem * 100
    if (d >= 65) return { label: 'Dem-Won',   cls: 'bg-blue-50 text-blue-700 border-blue-200' }
    if (d >= 52) return { label: 'Lean Dem',  cls: 'bg-blue-50/60 text-blue-600 border-blue-100' }
    if (d >= 48) return { label: 'Contested', cls: 'bg-slate-50 text-slate-500 border-slate-200' }
    if (d >= 35) return { label: 'Lean Rep',  cls: 'bg-red-50/60 text-red-600 border-red-100' }
    return             { label: 'Rep-Won',   cls: 'bg-red-50 text-red-700 border-red-200' }
}


// A group is "Feasible" when its VAP >= 400,000 — the Gingles precondition #1 proxy.
export const FEASIBLE_CLS     = 'bg-emerald-50 text-emerald-700 border-emerald-200 text-xs font-semibold px-2 py-0.5 min-w-[6.5rem] justify-center'
export const NOT_FEASIBLE_CLS = 'bg-red-50 text-red-500 border-red-200 text-xs font-semibold px-2 py-0.5 min-w-[6.5rem] justify-center'


// Keys match precinct.regionType; assigned via RUCA codes (1–3 urban, 4–6 suburban, 7–10 rural).
export const REGION_CLS = {
    urban:    'bg-purple-50 text-purple-700 border-purple-200',
    suburban: 'bg-sky-50 text-sky-700 border-sky-200',
    rural:    'bg-amber-50 text-amber-700 border-amber-200',
}


export const RACE_COLORS = {
    black:    '#009E73',
    white:    '#E69F00',
    latino:   '#F0E442',
    asian:    '#ec4899',
    other:    '#9c00d5',
}

export const RACE_LABELS = {
    black:    'Black',
    white:    'White',
    latino:   'Latino',
    asian:    'Asian',
    other:    'Other',
}


export const EFFECTIVE_FILL       = '#86efac'   // green-300
export const EFFECTIVE_BORDER     = '#16a34a'   // green-600
export const NOT_EFFECTIVE_FILL   = '#d1d5db'   // gray-300
export const NOT_EFFECTIVE_BORDER = '#6b7280'   // gray-500


export const STATE_COLORS = {
    AL: {
        fill:  '#f43f99',
        hover: '#db2777',
        badge: 'bg-pink-50 text-pink-600 border-pink-300',
    },
    OR: {
        fill:  '#14b8a6',
        hover: '#0f766e',
        badge: 'bg-teal-50 text-teal-600 border-teal-300',
    },
}


export const AXIS_COLOR  = '#64748b'   // slate-500
export const LABEL_COLOR = '#334155'   // slate-700
