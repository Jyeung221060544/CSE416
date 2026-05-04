/**
 * VRAImpactTable.jsx — 35/65 split infographic for VRA threshold comparisons.
 *
 * Outer grid: 2 cols (35% label | 65% charts).
 * Right side: inner 3-col grid (Race-Blind | VRA-Constrained | VRA Impact).
 * Each uses its own header + 3 data rows so alignment is exact.
 *
 * PROPS
 *   data    {object|null} — { [raceKey]: { rows: [{ id, label, raceBlindPct, vraConstrainedPct }] } }
 *   raceKey {string|null} — Race key to look up in data (e.g. 'black', 'latino').
 */

import { useEffect, useRef } from 'react'
import { COMPARE_RB_COLOR, COMPARE_VRA_COLOR } from '@/lib/partyColors'

const RB_COLOR     = COMPARE_RB_COLOR
const VRA_COLOR    = COMPARE_VRA_COLOR
const IMPACT_COLOR = '#0D0236'
const TRACK_CLR    = '#e2e8f0'
const DONUT_R      = 38
const DONUT_CIRC   = 2 * Math.PI * DONUT_R
const DONUT_SW     = 11
const DONUT_SIZE   = 110


/* ── Donut gauge ─────────────────────────────────────────────────────────── */

function DonutGauge({ pct, color }) {
    const arcRef  = useRef(null)
    const filled  = Math.min(Math.max(pct, 0), 1) * DONUT_CIRC

    useEffect(() => {
        const el = arcRef.current
        if (!el) return
        // Reset to empty, then animate to target on next frame
        el.style.transition = 'none'
        el.style.strokeDasharray = `0 ${DONUT_CIRC}`
        const id = requestAnimationFrame(() => {
            el.style.transition = 'stroke-dasharray 1.1s cubic-bezier(0.4, 0, 0.2, 1)'
            el.style.strokeDasharray = `${filled} ${DONUT_CIRC}`
        })
        return () => cancelAnimationFrame(id)
    }, [filled])

    return (
        <svg width={DONUT_SIZE} height={DONUT_SIZE} viewBox="0 0 100 100" style={{ display: 'block' }}>
            <circle cx={50} cy={50} r={DONUT_R} fill="none" stroke={TRACK_CLR} strokeWidth={DONUT_SW} />
            <circle
                ref={arcRef}
                cx={50} cy={50} r={DONUT_R}
                fill="none" stroke={color} strokeWidth={DONUT_SW}
                strokeLinecap="round"
                strokeDasharray={`0 ${DONUT_CIRC}`}
                transform="rotate(-90 50 50)"
                style={{ filter: `drop-shadow(0 0 4px ${color}55)` }}
            />
            <text x={50} y={53} textAnchor="middle" dominantBaseline="middle"
                fontSize={13} fontWeight={800} fill={color}
                style={{ fontVariantNumeric: 'tabular-nums' }}>
                {Math.round(pct * 100)}%
            </text>
        </svg>
    )
}


/* ── Main component ──────────────────────────────────────────────────────── */

export default function VRAImpactTable({ data, raceKey }) {
    const rows = data?.[raceKey]?.rows
    if (!rows?.length) return null

    return (
        /*
         * Single unified grid: 4 cols × 4 rows.
         * All cells in the same row share identical height — perfect alignment.
         * Col widths: label=35%, then 3 equal chart cols sharing the remaining 65%.
         */
        <div
            className="grid grid-rows-[auto_1fr_1fr_1fr] gap-3 h-full"
            style={{ gridTemplateColumns: '35% repeat(3, calc(65% / 3 - 0.75rem))' }}
        >
            {/* ── ROW 0: Headers ──────────────────────────────────────────── */}
            <div className="flex items-end justify-center pb-1">
                <span className="text-sm font-bold text-slate-500">% of Ensemble Plans</span>
            </div>
            <div className="flex items-end justify-center pb-1">
                <span className="text-sm font-bold" style={{ color: RB_COLOR }}>Race-Blind</span>
            </div>
            <div className="flex items-end justify-center pb-1">
                <span className="text-sm font-bold" style={{ color: VRA_COLOR }}>VRA-Constrained</span>
            </div>
            <div className="flex items-end justify-center pb-1">
                <span className="text-sm font-bold" style={{ color: IMPACT_COLOR }}>VRA Impact</span>
            </div>

            {/* ── ROWS 1-3: Data ──────────────────────────────────────────── */}
            {rows.map(row => {
                const delta    = row.vraConstrainedPct - row.raceBlindPct
                const deltaStr = `+${Math.round(delta * 100)}%`
                return [
                    /* Label card */
                    <div key={`lbl-${row.id}`}
                        className="flex items-center justify-center rounded-2xl px-6 text-center"
                        style={{ background: 'linear-gradient(135deg, #0f172a 60%, #1e293b)' }}
                    >
                        <span className="text-base font-extrabold leading-snug tracking-wide text-brand-surface">
                            {row.label}
                        </span>
                    </div>,

                    /* Race-Blind donut */
                    <div key={`rb-${row.id}`}
                        className="flex items-center justify-center rounded-2xl border border-brand-muted/15 bg-white shadow-sm">
                        <DonutGauge pct={row.raceBlindPct} color={RB_COLOR} />
                    </div>,

                    /* VRA-Constrained donut */
                    <div key={`vra-${row.id}`}
                        className="flex items-center justify-center rounded-2xl border border-brand-muted/15 bg-white shadow-sm">
                        <DonutGauge pct={row.vraConstrainedPct} color={VRA_COLOR} />
                    </div>,

                    /* VRA Impact */
                    <div key={`imp-${row.id}`}
                        className="flex items-center justify-center rounded-2xl border border-brand-muted/15 bg-white shadow-sm">
                        <div className="flex flex-col items-center gap-1 px-8">
                            <span className="text-2xl font-extrabold tabular-nums" style={{ color: IMPACT_COLOR }}>
                                {deltaStr}
                            </span>
                            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
                                more plans
                            </span>
                        </div>
                    </div>,
                ]
            })}
        </div>
    )
}
