import { Badge } from '@/components/ui/badge'
import SurfacePanel from '@/components/ui/surface-panel'
import useAppStore from '../../store/useAppStore'
import { PARTY_BADGE, DEM_TEXT, REP_TEXT } from '@/lib/partyColors'
import { ROW_BORDER, ACTIVE_LABEL, INACTIVE_LABEL, rowBg } from '@/lib/tableStyles'

/**
 * Formatted vote-margin label (e.g. "D+12.4%") in the appropriate party color.
 *
 * @param {{ pct: number, dir: string }} props
 *   pct — margin as a decimal (0–1); values >= 1 display as "100%".
 *   dir — "D" for Democratic, "R" for Republican.
 */
function VoteMargin({ pct, dir }) {
    const color = dir === 'D' ? DEM_TEXT : REP_TEXT
    return (
        <span className={`tabular-nums font-bold text-sm ${color}`}>
            {dir}+{pct >= 1.0 ? '100%' : `${(pct * 100).toFixed(1)}%`}
        </span>
    )
}

/**
 * Congressional district table. Each row is clickable and cross-highlights
 * the matching district polygon in DistrictMap2024 via selectedDistrict.
 *
 * @param {{ districtSummary: object }} props
 */
export default function CongressionalTable({ districtSummary }) {
    const { selectedDistrict, setSelectedDistrict } = useAppStore()

    if (!districtSummary) return null
    const { districts, electionYear } = districtSummary

    function handleRowClick(districtNumber) {
        setSelectedDistrict(districtNumber === selectedDistrict ? null : districtNumber)
    }

    return (
        <SurfacePanel className="overflow-x-auto border-brand-muted/25">
          <div className="min-w-0">

            <div className="grid grid-cols-[44px_2fr_90px_68px_68px_1fr] gap-x-1 items-end px-3 py-3 bg-brand-darkest text-brand-surface text-sm font-semibold">
                <span className="whitespace-nowrap text-center">Dist.</span>
                <span className="whitespace-nowrap text-center">Representative</span>
                <span className="whitespace-nowrap text-center">Party</span>
                <span className="whitespace-nowrap text-center">Race</span>
                <span className="text-center leading-tight">{electionYear}<br/>Margin</span>
                <span className="text-center leading-tight">Effective-<br/>ness</span>
            </div>

            {districts.map((d, i) => {
                const p           = PARTY_BADGE[d.party] ?? PARTY_BADGE.Republican
                const isActive    = d.districtNumber === selectedDistrict
                const isEffective = d.isEffective ?? false

                return (
                    <div
                        key={d.districtId}
                        onClick={() => handleRowClick(d.districtNumber)}
                        className={[
                            'grid grid-cols-[44px_2fr_90px_68px_68px_1fr] gap-x-1 items-center',
                            'px-3 py-2.5 cursor-pointer select-none transition-colors',
                            ROW_BORDER,
                            rowBg(i, isActive),
                        ].join(' ')}
                    >
                        <span className={`font-bold text-sm text-center tabular-nums ${isActive ? ACTIVE_LABEL : INACTIVE_LABEL}`}>
                            {d.districtNumber}
                        </span>
                        <span className="text-gray-800 font-semibold text-sm text-left">{d.representative}</span>
                        <Badge variant="outline" className={`w-fit text-xs font-semibold px-2 ${p}`}>
                            {d.party}
                        </Badge>
                        <span className="text-gray-600 text-sm text-left">{d.racialGroup}</span>
                        <div className="flex justify-end">
                            <VoteMargin pct={d.voteMarginPercentage} dir={d.voteMarginDirection} />
                        </div>
                        <div className="text-center">
                            <span className={`text-sm font-bold tabular-nums ${isEffective ? 'text-green-600' : 'text-brand-muted/40'}`}>
                                {isEffective ? '1' : '0'}
                            </span>
                        </div>
                    </div>
                )
            })}

          </div>
        </SurfacePanel>
    )
}
