/**
 * @file CongressionalTable.jsx
 * @description Tabular view of all congressional districts for the selected
 *   state. Clicking a row toggles the global `selectedDistrict` store value,
 *   which cross-highlights the corresponding polygon in DistrictMap2024.
 *
 * PROPS
 * @prop {object} districtSummary - District data from useStateData:
 *   { districts: [{ districtId, districtNumber, representative, party,
 *                   racialGroup, voteMarginPercentage, voteMarginDirection }],
 *     electionYear: number }
 *
 * STATE SOURCES
 * - selectedDistrict    : Zustand store (shared with DistrictMap2024).
 * - setSelectedDistrict : Zustand action — toggles or clears selection.
 *
 * LAYOUT
 * - <SurfacePanel> wrapper with horizontal scroll.
 * - Fixed-column grid: District | Representative | Party | Racial Group | Margin.
 * - Dark header row; alternating row backgrounds via rowBg utility.
 * - Party badge colored via PARTY_BADGE lookup.
 * - Vote margin rendered by <VoteMargin> with tabular-nums formatting.
 */

/* ── Step 0: UI component and utility imports ─────────────────────────── */
import { Badge } from '@/components/ui/badge'
import SurfacePanel from '@/components/ui/surface-panel'
import useAppStore from '../../store/useAppStore'
import { PARTY_BADGE, DEM_TEXT, REP_TEXT } from '@/lib/partyColors'
import { ROW_BORDER, ACTIVE_LABEL, INACTIVE_LABEL, rowBg } from '@/lib/tableStyles'

/* ── Step 1: VoteMargin sub-component ────────────────────────────────── */
/**
 * Displays a formatted vote-margin label (e.g. "D+12.4%") in the
 * appropriate party color.
 *
 * @param {object} props
 * @param {number} props.pct - Margin as a decimal (0–1). Values >= 1 display as "100%".
 * @param {string} props.dir - Direction label: "D" for Democratic, "R" for Republican.
 * @returns {JSX.Element} A colored <span> with the margin string.
 */
function VoteMargin({ pct, dir }) {
    const color = dir === 'D' ? DEM_TEXT : REP_TEXT
    return (
        <span className={`tabular-nums font-bold text-sm ${color}`}>
            {dir}+{pct >= 1.0 ? '100%' : `${(pct * 100).toFixed(1)}%`}
        </span>
    )
}

/* ── Step 2: Main CongressionalTable component ────────────────────────── */
/**
 * Renders the full congressional district table for a state.
 * Each row is clickable and cross-highlights the matching district on the map.
 *
 * @param {object} props
 * @param {object} props.districtSummary - Summary object containing districts
 *   array and electionYear.
 * @returns {JSX.Element|null} The district table, or null if no data.
 */
export default function CongressionalTable({ districtSummary }) {
    /* ── Step 2a: Pull selected district state from store ── */
    const { selectedDistrict, setSelectedDistrict } = useAppStore()

    /* ── Step 2b: Guard — no data means nothing to render ── */
    if (!districtSummary) return null
    const { districts, electionYear } = districtSummary

    /* ── Step 2c: Row click handler — toggles selection ── */
    /**
     * Toggles district selection. Clicking the already-selected district
     * clears the selection (sets it to null).
     *
     * @param {number} districtNumber - The district number of the clicked row.
     */
    function handleRowClick(districtNumber) {
        // Toggle: clicking the already-selected district deselects it
        setSelectedDistrict(districtNumber === selectedDistrict ? null : districtNumber)
    }

    /* ── Step 2d: Render ── */
    return (
        <SurfacePanel className="overflow-x-auto border-brand-muted/25">
          <div className="min-w-0">

            {/* ── COLUMN HEADER ──────────────────────────────────────── */}
            <div className="grid grid-cols-[80px_1fr_100px_80px_90px] gap-x-3 items-center px-4 py-3 bg-brand-darkest text-brand-surface text-sm font-semibold">
                <span>District</span>
                <span>Representative</span>
                <span>Party</span>
                <span>Racial Group</span>
                <span className="text-right">{electionYear} Margin</span>
            </div>

            {/* ── DATA ROWS ──────────────────────────────────────────── */}
            {/* Rows — clicking a row highlights that district on the map (GUI-7) */}
            {districts.map((d, i) => {
                const p         = PARTY_BADGE[d.party] ?? PARTY_BADGE.Republican
                const isActive  = d.districtNumber === selectedDistrict

                return (
                    <div
                        key={d.districtId}
                        onClick={() => handleRowClick(d.districtNumber)}
                        className={[
                            'grid grid-cols-[80px_1fr_100px_80px_90px] gap-x-3 items-center',
                            'px-4 py-3 cursor-pointer select-none transition-colors',
                            ROW_BORDER,
                            rowBg(i, isActive),
                        ].join(' ')}
                    >
                        {/* District number */}
                        <span className={`font-bold text-sm ${isActive ? ACTIVE_LABEL : INACTIVE_LABEL}`}>
                            District {d.districtNumber}
                        </span>

                        {/* Representative name */}
                        <span className="text-gray-800 font-semibold text-sm">{d.representative}</span>

                        {/* Party badge */}
                        <Badge variant="outline" className={`w-fit text-sm font-semibold px-2.5 ${p}`}>
                            {d.party}
                        </Badge>

                        {/* Majority racial group */}
                        <span className="text-gray-600 text-sm">{d.racialGroup}</span>

                        {/* Election vote margin */}
                        <div className="text-right">
                            <VoteMargin pct={d.voteMarginPercentage} dir={d.voteMarginDirection} />
                        </div>
                    </div>
                )
            })}

          </div>
        </SurfacePanel>
    )
}
