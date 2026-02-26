/**
 * tableStyles.js — Shared Tailwind class strings for all data tables.
 *
 * WHY THIS FILE EXISTS
 * Every table (CongressionalTable, GinglesPrecinctTable, EnsembleSummaryTable,
 * DemographicPopulationTable, StateSummaryTable) imports from here so that
 * hover states, borders, and active highlights are visually consistent.
 *
 * USAGE PATTERN
 *   import { TABLE_HEADER, ROW_BORDER, rowBg, ACTIVE_LABEL } from '@/lib/tableStyles'
 *   <div className={`... ${TABLE_HEADER}`}>...</div>
 *   <div className={`... ${ROW_BORDER} ${rowBg(i, isActive)}`}>...</div>
 */


/* ── Step 0: Header row style ────────────────────────────────────────────────
 *  Applied to every table's sticky/static header row.
 *  bg-brand-darkest = deep navy background matching the sidebar
 *  text-brand-surface = near-white text readable on dark background
 * ─────────────────────────────────────────────────────────────────────────── */
export const TABLE_HEADER = 'bg-brand-darkest text-brand-surface text-sm font-semibold'


/* ── Step 1: Row divider ─────────────────────────────────────────────────────
 *  Thin top border applied to every data row (except the first) to visually
 *  separate rows without adding too much visual weight.
 * ─────────────────────────────────────────────────────────────────────────── */
export const ROW_BORDER = 'border-t border-brand-muted/15'


/* ── Step 2: Selected / active row highlight ─────────────────────────────────
 *  Applied when a row is the currently selected district or precinct.
 *  Uses a subtle purple ring (brand-primary at 30% opacity) rather than a
 *  solid fill so the content underneath remains legible.
 * ─────────────────────────────────────────────────────────────────────────── */
export const ACTIVE_ROW = 'bg-brand-primary/15 ring-1 ring-inset ring-brand-primary/70'


/* ── Step 3: Hover style for clickable rows ──────────────────────────────────
 *  Combined with altRowBg() in rowBg() below. Only applied when the row is
 *  NOT the active/selected row (active ring takes visual priority).
 * ─────────────────────────────────────────────────────────────────────────── */
export const ROW_HOVER = 'hover:bg-brand-primary/10'


/* ── Step 4: Label text colors ───────────────────────────────────────────────
 *  ACTIVE_LABEL    → applied to the primary identifier cell of the selected row
 *                    (brand-primary purple, same as the ring)
 *  INACTIVE_LABEL  → applied to identifier cells of non-selected rows
 *                    (brand-deep, a subdued navy that contrasts with white bg)
 * ─────────────────────────────────────────────────────────────────────────── */
export const ACTIVE_LABEL   = 'text-brand-primary'
export const INACTIVE_LABEL = 'text-brand-deep'


/* ── Step 5: Alternating row background ──────────────────────────────────────
 *
 *  @param  {number} i  Zero-based row index from the .map() callback.
 *                      Even rows get white; odd rows get a very light surface tint.
 *  @returns {string}   Tailwind background class string.
 * ─────────────────────────────────────────────────────────────────────────── */
export function altRowBg(i) {
    return i % 2 === 0 ? 'bg-white' : 'bg-brand-surface/60'
}


/* ── Step 6: Composite row background ────────────────────────────────────────
 *
 *  Single helper used by every clickable data row.
 *  When the row is active (selected), the ring highlight takes full priority.
 *  When inactive, alternating bg + hover transition is applied.
 *
 *  @param  {number}  i         Zero-based row index (passed to altRowBg).
 *  @param  {boolean} isActive  Whether this row is currently selected.
 *                              Comes from comparing the row's id / districtNumber
 *                              against the store's selectedDistrict / selectedId.
 *  @returns {string}   Tailwind class string.
 * ─────────────────────────────────────────────────────────────────────────── */
export function rowBg(i, isActive = false) {
    return isActive ? ACTIVE_ROW : `${altRowBg(i)} ${ROW_HOVER}`
}
