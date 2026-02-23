import { MapPin, ArrowLeft, MousePointerClick } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import SectionHeader from '@/components/ui/section-header'
import MapFrame from '@/components/ui/map-frame'
import InfoCallout from '@/components/ui/info-callout'
import { PARTY_BADGE, DEM_TEXT, REP_TEXT } from '@/lib/partyColors'
import useAppStore from '../../store/useAppStore'
import DistrictMap2024 from '../maps/DistrictMap2024'
import CongressionalTable from '../tables/CongressionalTable'
import EnsembleSummaryTable from '../tables/EnsembleSummaryTable'
import DemographicPopulationTable from '../tables/DemographicPopulationTable'


function StatCard({ label, value, sub }) {
    return (
        <Card className="p-0 border-brand-muted/25 shadow-sm min-w-0">
            <CardContent className="px-3 py-3 min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-widest text-brand-muted mb-1 truncate">{label}</p>
                <p className="text-lg font-bold text-brand-darkest tabular-nums leading-tight break-words">{value ?? '—'}</p>
                {sub && <p className="text-xs text-brand-muted/60 mt-1 truncate">{sub}</p>}
            </CardContent>
        </Card>
    )
}

function DistBar({ demPct, repPct }) {
    return (
        <div className="flex h-3 w-full rounded-full overflow-hidden">
            <div className="bg-blue-500" style={{ width: `${demPct}%` }} />
            <div className="bg-red-500"  style={{ width: `${repPct}%` }} />
        </div>
    )
}

// ── District detail card ──────────────────────────────────────────────
function DistrictDetailCard({ district }) {
    if (!district) {
        return (
            <Card className="h-full p-0 border-brand-muted/25 shadow-sm">
                <CardContent className="h-full flex flex-col items-center justify-center gap-5 text-center px-8 py-8">
                    <div className="w-14 h-14 rounded-full bg-brand-muted/10 flex items-center justify-center ring-1 ring-brand-muted/20">
                        <MapPin className="w-6 h-6 text-brand-muted/40" />
                    </div>
                    <div>
                        <p className="text-brand-darkest font-bold text-base">No District Selected</p>
                        <p className="text-brand-muted/60 text-sm mt-2 leading-relaxed">
                            Click a district on the map or a row in the table below to view its details.
                        </p>
                    </div>
                </CardContent>
            </Card>
        )
    }

    const isUncontested = district.voteMarginPercentage >= 1.0
    const marginCls     = district.voteMarginDirection === 'D' ? DEM_TEXT : REP_TEXT
    const marginLabel   = `${district.voteMarginDirection}+${isUncontested ? '100' : (district.voteMarginPercentage * 100).toFixed(1)}%`

    return (
        <Card className="h-full p-0 border-brand-muted/25 shadow-sm overflow-hidden">
            <CardHeader className="pb-3 pt-6 px-6">
                <div className="flex items-center gap-2 mb-2">
                    <MapPin className="w-4 h-4 text-brand-muted" />
                    <span className="text-brand-muted text-xs uppercase tracking-[0.18em] font-semibold">
                        District Profile
                    </span>
                </div>
                <CardTitle className="text-brand-darkest text-3xl font-bold tracking-tight">
                    District {district.districtNumber}
                </CardTitle>
            </CardHeader>

            <Separator className="mx-6 bg-brand-muted/20" />

            <CardContent className="pt-5 px-6 flex flex-col gap-5">
                <div className="flex items-start justify-between gap-3">
                    <span className="text-brand-muted font-medium text-sm shrink-0">Representative</span>
                    <span className="text-brand-darkest font-bold text-base text-right">{district.representative}</span>
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-brand-muted font-medium text-sm">Party</span>
                    <Badge variant="outline" className={`text-sm font-bold px-3 py-0.5 ${PARTY_BADGE[district.party]}`}>
                        {district.party}
                    </Badge>
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-brand-muted font-medium text-sm">Racial Group</span>
                    <span className="text-brand-darkest font-semibold text-base">{district.racialGroup}</span>
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-brand-muted font-medium text-sm">Vote Margin</span>
                    <span className={`font-extrabold tabular-nums text-xl ${marginCls}`}>
                        {marginLabel}
                    </span>
                </div>
                <Separator className="bg-brand-muted/20" />
                <p className="text-brand-muted/40 text-xs text-center">Click again to deselect</p>
            </CardContent>
        </Card>
    )
}

// ── Main section ──────────────────────────────────────────────────────
export default function StateOverviewSection({ data, stateId }) {
    const selectedDistrict    = useAppStore(s => s.selectedDistrict)
    const setSelectedDistrict = useAppStore(s => s.setSelectedDistrict)
    const raceFilter          = useAppStore(s => s.raceFilter)
    const setRaceFilter       = useAppStore(s => s.setRaceFilter)

    const stateData         = data?.stateSummary
    const districtData      = data?.districtSummary
    const ensembleData      = data?.ensembleSummary
    const demographicGroups = stateData?.demographicGroups ?? []

    const demSeats = stateData?.congressionalRepresentatives?.byParty?.find(p => p.party === 'Democratic')?.seats ?? 0
    const repSeats = stateData?.congressionalRepresentatives?.byParty?.find(p => p.party === 'Republican')?.seats ?? 0
    const total    = stateData?.congressionalRepresentatives?.totalSeats ?? 0

    const demVote  = stateData?.voterDistribution?.democraticVoteShare
    const repVote  = stateData?.voterDistribution?.republicanVoteShare
    const voteYear = stateData?.voterDistribution?.electionYear

    const selectedDistrictData = districtData?.districts?.find(d => d.districtNumber === selectedDistrict) ?? null

    return (
        <section id="state-overview" className="p-4 sm:p-6 lg:p-8 border-b border-brand-muted/30">

            {/* ── Header ───────────────────────────────────────────── */}
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-brand-darkest tracking-tight">State Overview</h2>
                {stateData?.isPreclearance && (
                    <Badge className="bg-brand-primary/10 text-brand-primary border-brand-primary/30 text-xs font-semibold">
                        VRA Preclearance Required
                    </Badge>
                )}
            </div>

            {/* Map legend */}
            <div className="flex items-center gap-4 mb-3 text-sm text-brand-muted/70">
                <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-sm bg-blue-400/60 border border-blue-600 shrink-0" /> Democratic
                </span>
                <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-sm bg-red-400/60 border border-red-600 shrink-0" /> Republican
                </span>
                <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-sm bg-brand-primary/60 border border-brand-surface shrink-0" /> Selected
                </span>
            </div>

            {/* ── Map | Right panel ─────────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-[58fr_42fr] gap-5 mb-8">

                <MapFrame className="h-[340px] sm:h-[420px] lg:h-[520px]">
                    <DistrictMap2024 stateId={stateId} districtSummary={districtData} />
                </MapFrame>

                {selectedDistrict ? (
                    <div className="flex flex-col gap-4">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedDistrict(null)}
                            className="self-start flex items-center gap-1.5 text-brand-deep hover:text-brand-darkest"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Back to Summary
                        </Button>
                        <div className="flex-1">
                            <DistrictDetailCard district={selectedDistrictData} />
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col gap-5 overflow-y-auto pr-1">

                        {/* Stat cards 2×2 */}
                        <div className="grid grid-cols-2 gap-3">
                            <StatCard label="Total Population"  value={stateData?.totalPopulation?.toLocaleString()} />
                            <StatCard label="Voting Age Pop."   value={stateData?.votingAgePopulation?.toLocaleString()} />
                            <StatCard label="Districts"         value={stateData?.numDistricts} />
                            <StatCard label="Controlling Party" value={stateData?.redistrictingControl?.controllingParty} />
                        </div>

                        {/* Voter distribution */}
                        {demVote != null && repVote != null && (
                            <div>
                                <SectionHeader title={`${voteYear ?? ''} Voter Distribution`} />
                                <div className="flex flex-col gap-2">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="w-3 h-3 rounded-sm bg-blue-500 shrink-0" />
                                            <span className="text-sm text-brand-deep font-medium">Democratic</span>
                                        </div>
                                        <span className={`text-base font-bold tabular-nums ${DEM_TEXT}`}>
                                            {(demVote * 100).toFixed(1)}%
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="w-3 h-3 rounded-sm bg-red-500 shrink-0" />
                                            <span className="text-sm text-brand-deep font-medium">Republican</span>
                                        </div>
                                        <span className={`text-base font-bold tabular-nums ${REP_TEXT}`}>
                                            {(repVote * 100).toFixed(1)}%
                                        </span>
                                    </div>
                                    <DistBar demPct={demVote * 100} repPct={repVote * 100} />
                                </div>
                            </div>
                        )}

                        {/* Seat distribution */}
                        <div>
                            <SectionHeader title={`${districtData?.electionYear ?? ''} Seat Distribution`} />
                            <div className="flex flex-col gap-2">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="w-3 h-3 rounded-sm bg-blue-500 shrink-0" />
                                        <span className="text-sm text-brand-deep font-medium">Democratic</span>
                                    </div>
                                    <span className={`text-base font-bold tabular-nums ${DEM_TEXT}`}>
                                        {demSeats} <span className="text-brand-muted/60 text-sm font-normal">/ {total}</span>
                                    </span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="w-3 h-3 rounded-sm bg-red-500 shrink-0" />
                                        <span className="text-sm text-brand-deep font-medium">Republican</span>
                                    </div>
                                    <span className={`text-base font-bold tabular-nums ${REP_TEXT}`}>
                                        {repSeats} <span className="text-brand-muted/60 text-sm font-normal">/ {total}</span>
                                    </span>
                                </div>
                                {total > 0 && <DistBar demPct={(demSeats / total) * 100} repPct={(repSeats / total) * 100} />}
                            </div>
                        </div>

                        <InfoCallout icon={MousePointerClick} className="mt-auto">
                            Click a district on the map or a table row in the 2024 Congressional Districts Table to view its details here!
                        </InfoCallout>
                    </div>
                )}
            </div>

            {/* ── Congressional table | Ensemble + Demographics ────── */}
            <div className="mb-8 grid grid-cols-1 lg:grid-cols-[58fr_42fr] gap-5">
                <div className="flex flex-col">
                    <SectionHeader title={`${districtData?.electionYear ?? 'Enacted'} Congressional Districts`} />
                    <CongressionalTable districtSummary={districtData} />
                    <InfoCallout icon={MousePointerClick} className="mt-auto pt-6">
                        Click a row to highlight the district on the map and view district details above!
                    </InfoCallout>
                </div>
                <div className="flex flex-col gap-6">
                    <div>
                        <SectionHeader title="Ensemble Summary" />
                        <EnsembleSummaryTable ensembleSummary={ensembleData} />
                    </div>
                    <div>
                        <SectionHeader title="Population by Group" />
                        <DemographicPopulationTable
                            demographicGroups={demographicGroups}
                            raceFilter={raceFilter}
                            setRaceFilter={setRaceFilter}
                        />
                    </div>
                </div>
            </div>

        </section>
    )
}
