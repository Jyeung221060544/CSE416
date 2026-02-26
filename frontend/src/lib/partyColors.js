/**
 * partyColors.js — Centralized color constants for all charts, badges, and text.
 *
 * WHY THIS FILE EXISTS
 * Every chart (Nivo), badge (Shadcn), and table cell that encodes party or race
 * data imports from here. Keeping it in one place means a single edit updates
 * the visual encoding everywhere in the app.
 *
 * EXPORTS OVERVIEW
 *   Step 0: Party hex colors      → raw hex for Nivo SVG inline styles
 *   Step 1: Party Tailwind classes → className strings for JSX badges / text
 *   Step 2: getOutcome()           → Dem share float → label + badge class
 *   Step 3: Feasibility classes    → DemographicPopulationTable badges
 *   Step 4: Region type classes    → GinglesPrecinctTable region badges
 *   Step 5: Race colors + labels   → EI KDE / bar charts and heatmap
 *   Step 6: Axis / label colors    → shared Nivo theme across all charts
 */


/* ── Step 0: Political party hex colors ──────────────────────────────────────
 *
 *  Raw hex strings — passed directly into Nivo config objects (SVG attributes).
 *  Tailwind utility classes cannot be used inside JS objects.
 *
 *  DEM_COLOR / DEM_DARK   → scatter dots, KDE lines, bar fills, trendlines (Dem)
 *  REP_COLOR / REP_DARK   → same, for Republican
 *  TIE_COLOR              → EnsembleSplitChart bars where R seats == D seats
 *  ENACTED_COLOR          → enacted plan column highlight in EnsembleSplitChart
 *  THRESH_COLOR           → 50% majority threshold line across all charts
 * ─────────────────────────────────────────────────────────────────────────── */
export const DEM_COLOR     = '#3b82f6'   // blue-500    (Dem primary)
export const DEM_DARK      = '#1d4ed8'   // blue-700    (Dem trendline / darker accent)
export const REP_COLOR     = '#ef4444'   // red-500     (Rep primary)
export const REP_DARK      = '#b91c1c'   // red-700     (Rep trendline / darker accent)
export const TIE_COLOR     = '#a855f7'   // purple-500  (tied seat bar)
export const ENACTED_COLOR = '#595a96'   // brand-primary (enacted plan marker)
export const THRESH_COLOR  = '#94a3b8'   // slate-400   (neutral threshold lines)


/* ── Step 1: Party Tailwind badge and text classes ───────────────────────────
 *
 *  Used in JSX className props — Tailwind purges unused classes at build time
 *  so these strings must be complete class names (not template literals).
 *
 *  PARTY_BADGE           → CongressionalTable party column, DistrictDetailCard
 *                          Key must match exact party string in data:
 *                          'Democratic' | 'Republican'
 *
 *  DEM_TEXT / REP_TEXT         → vote share numbers on light (white) backgrounds
 *  DEM_HEADER_TEXT / REP_HEADER_TEXT → column headers on dark (brand-darkest) bg
 * ─────────────────────────────────────────────────────────────────────────── */
export const PARTY_BADGE = {
    Democratic: 'bg-blue-50 text-blue-700 border-blue-200',
    Republican:  'bg-red-50 text-red-700 border-red-200',
}

export const DEM_TEXT        = 'text-blue-600'    // values on light background
export const REP_TEXT        = 'text-red-600'     // values on light background
export const DEM_HEADER_TEXT = 'text-blue-300'    // column headers on brand-darkest bg
export const REP_HEADER_TEXT = 'text-red-300'     // column headers on brand-darkest bg


/* ── Step 2: Political outcome badge factory ─────────────────────────────────
 *
 *  Used by: GinglesSummaryTable (Result column)
 *
 *  @param  {number} dem  Democratic vote share as a decimal 0.0–1.0.
 *                        Sourced from summaryRow.avgDemocraticVoteShare
 *                        (arithmetic mean of precinct vote shares within each bin).
 *
 *  @returns {{ label: string, cls: string }}
 *           label  — human-readable string rendered inside the Badge component
 *           cls    — Tailwind class string applied to Badge variant="outline"
 *
 *  Thresholds
 *    >= 65%  Dem-Won    (strong D)
 *    >= 52%  Lean Dem   (lean D)
 *    >= 48%  Contested  (toss-up)
 *    >= 35%  Lean Rep   (lean R)
 *    <  35%  Rep-Won    (strong R)
 * ─────────────────────────────────────────────────────────────────────────── */
export function getOutcome(dem) {
    const d = dem * 100
    if (d >= 65) return { label: 'Dem-Won',   cls: 'bg-blue-50 text-blue-700 border-blue-200' }
    if (d >= 52) return { label: 'Lean Dem',  cls: 'bg-blue-50/60 text-blue-600 border-blue-100' }
    if (d >= 48) return { label: 'Contested', cls: 'bg-slate-50 text-slate-500 border-slate-200' }
    if (d >= 35) return { label: 'Lean Rep',  cls: 'bg-red-50/60 text-red-600 border-red-100' }
    return             { label: 'Rep-Won',   cls: 'bg-red-50 text-red-700 border-red-200' }
}


/* ── Step 3: Feasibility badge classes ───────────────────────────────────────
 *
 *  Used by: DemographicPopulationTable, StateSummaryTable
 *
 *  A group is "Feasible" when its Voting Age Population (VAP) >= 400,000 —
 *  the threshold used as the Gingles precondition #1 proxy in this app.
 *  The isFeasible flag comes from stateSummary.demographicGroups[].isFeasible
 *  (set on the backend based on the state's actual VAP data).
 * ─────────────────────────────────────────────────────────────────────────── */
export const FEASIBLE_CLS     = 'bg-emerald-50 text-emerald-700 border-emerald-200 text-xs font-semibold px-2 py-0.5 min-w-[6.5rem] justify-center'
export const NOT_FEASIBLE_CLS = 'bg-red-50 text-red-500 border-red-200 text-xs font-semibold px-2 py-0.5 min-w-[6.5rem] justify-center'


/* ── Step 4: Region type badge classes ───────────────────────────────────────
 *
 *  Used by: GinglesPrecinctTable (Region column)
 *
 *  Region type is assigned per precinct by mergingData.py using RUCA codes:
 *    RUCA 1–3   → 'urban'    → purple badge
 *    RUCA 4–6   → 'suburban' → sky badge
 *    RUCA 7–10  → 'rural'    → amber badge
 *
 *  The key matches precinct.regionType (lowercase string from the data).
 * ─────────────────────────────────────────────────────────────────────────── */
export const REGION_CLS = {
    urban:    'bg-purple-50 text-purple-700 border-purple-200',
    suburban: 'bg-sky-50 text-sky-700 border-sky-200',
    rural:    'bg-amber-50 text-amber-700 border-amber-200',
}


/* ── Step 5: Ecological Inference race color palette ─────────────────────────
 *
 *  Used by: EIKDEChart (line + area fill), EIBarChart (bar border accent),
 *           DemographicHeatmap indirectly (bins use server-assigned colors)
 *
 *  RACE_COLORS  → raw hex for Nivo SVG rendering
 *                 Keys are lowercase race strings matching eiRaceFilter values:
 *                 'black' | 'white' | 'hispanic' | 'asian' | 'other'
 *
 *  RACE_LABELS  → display strings for legends, tooltips, and table headers
 * ─────────────────────────────────────────────────────────────────────────── */
export const RACE_COLORS = {
    black:    '#009E73',   
    white:    '#E69F00 ', 
    hispanic: '#F0E442',   
    asian:    '#CC79A7',   
    other:    '#D55E00',  
}

export const RACE_LABELS = {
    black:    'Black',
    white:    'White',
    hispanic: 'Hispanic',
    asian:    'Asian',
    other:    'Other',
}


/* ── Step 6: Shared Nivo chart axis / label UI colors ────────────────────────
 *
 *  Used by: GinglesScatterPlot, EIKDEChart, EIBarChart, EnsembleSplitChart
 *  Passed into each chart's `theme` config object under axis.ticks / legend.
 *
 *  AXIS_COLOR   → tick mark lines + domain line (the chart border)
 *  LABEL_COLOR  → tick number text + axis legend label text
 * ─────────────────────────────────────────────────────────────────────────── */
export const AXIS_COLOR  = '#64748b'   // slate-500
export const LABEL_COLOR = '#334155'   // slate-700
