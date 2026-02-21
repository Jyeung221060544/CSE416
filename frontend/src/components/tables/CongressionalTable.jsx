import { Badge } from '@/components/ui/badge'
import SurfacePanel from '@/components/ui/surface-panel'
import useAppStore from '../../store/useAppStore'

const PARTY = {
    Democratic: { badge: 'bg-blue-50 text-blue-700 border-blue-200' },
    Republican:  { badge: 'bg-red-50  text-red-700  border-red-200'  },
}

function VoteMargin({ pct, dir }) {
    if (pct >= 1.0) return <span className="tabular-nums font-bold text-sm text-gray-500">100%</span>
    const color = dir === 'D' ? 'text-blue-600' : 'text-red-600'
    return (
        <span className={`tabular-nums font-bold text-sm ${color}`}>
            {dir}+{(pct * 100).toFixed(1)}%
        </span>
    )
}

export default function CongressionalTable({ districtSummary }) {
    const { selectedDistrict, setSelectedDistrict } = useAppStore()

    if (!districtSummary) return null
    const { districts, electionYear } = districtSummary

    function handleRowClick(districtNumber) {
        // Toggle: clicking the already-selected district deselects it
        setSelectedDistrict(districtNumber === selectedDistrict ? null : districtNumber)
    }

    return (
        <SurfacePanel className="overflow-x-auto border-brand-muted/25">
          <div className="min-w-[560px]">
            {/* Header */}
            <div className="grid grid-cols-[80px_1fr_120px_110px_100px] gap-x-3 items-center px-4 py-3 bg-brand-darkest text-brand-surface text-sm font-semibold">
                <span>District</span>
                <span>Representative</span>
                <span>Party</span>
                <span>Racial Group</span>
                <span className="text-right">{electionYear} Margin</span>
            </div>

            {/* Rows — clicking a row highlights that district on the map (GUI-7) */}
            {districts.map((d, i) => {
                const p         = PARTY[d.party] ?? PARTY.Republican
                const isActive  = d.districtNumber === selectedDistrict

                return (
                    <div
                        key={d.districtId}
                        onClick={() => handleRowClick(d.districtNumber)}
                        className={[
                            'grid grid-cols-[80px_1fr_120px_110px_100px] gap-x-3 items-center',
                            'px-4 py-3 border-t border-brand-muted/15',
                            'cursor-pointer select-none transition-colors',
                            isActive
                                ? 'bg-brand-primary/15 ring-1 ring-inset ring-brand-primary/30'
                                : i % 2 === 0
                                    ? 'bg-white hover:bg-brand-primary/5'
                                    : 'bg-brand-surface/60 hover:bg-brand-primary/5',
                        ].join(' ')}
                    >
                        <span className={`font-bold text-sm ${isActive ? 'text-brand-primary' : 'text-brand-deep'}`}>
                            District {d.districtNumber}
                        </span>
                        <span className="text-gray-800 font-semibold text-sm">{d.representative}</span>
                        <Badge variant="outline" className={`w-fit text-sm font-semibold px-2.5 ${p.badge}`}>
                            {d.party}
                        </Badge>
                        <span className="text-gray-600 text-sm">{d.racialGroup}</span>
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
