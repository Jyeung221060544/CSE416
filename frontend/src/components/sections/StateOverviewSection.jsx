import { MapPin } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import useAppStore from '../../store/useAppStore'
import DistrictMap2022 from '../maps/DistrictMap2022'
import CongressionalTable from '../tables/CongressionalTable'
import EnsembleSummaryTable from '../tables/EnsembleSummaryTable'

// ── Shared sub-components ─────────────────────────────────────────────

function StatCard({ label, value, sub }) {
    return (
        <Card className="p-0 border-brand-muted/25 shadow-sm">
            <CardContent className="px-5 py-4">
                <p className="text-xs font-bold uppercase tracking-widest text-brand-muted mb-1">{label}</p>
                <p className="text-3xl font-bold text-brand-darkest tabular-nums leading-tight">{value ?? '—'}</p>
                {sub && <p className="text-sm text-gray-400 mt-1">{sub}</p>}
            </CardContent>
        </Card>
    )
}

function SectionHeader({ title }) {
    return (
        <div className="flex items-center gap-3 mb-4">
            <h3 className="text-base font-bold uppercase tracking-widest text-brand-deep shrink-0">{title}</h3>
            <Separator className="flex-1 bg-brand-muted/25" />
        </div>
    )
}

function DistBar({ demPct, repPct }) {
    return (
        <div className="flex h-3 w-44 rounded-full overflow-hidden shrink-0">
            <div className="bg-blue-500" style={{ width: `${demPct}%` }} />
            <div className="bg-red-500"  style={{ width: `${repPct}%` }} />
        </div>
    )
}

// ── District detail card (right panel, 40%) ───────────────────────────

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

    const partyBadge    = district.party === 'Democratic'
        ? 'bg-blue-50 text-blue-700 border-blue-200'
        : 'bg-red-50 text-red-700 border-red-200'
    const marginColor   = district.voteMarginDirection === 'D' ? 'text-blue-600' : 'text-red-600'
    const uncontested   = district.voteMarginPercentage >= 1.0

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
                    <Badge variant="outline" className={`text-sm font-bold px-3 py-0.5 ${partyBadge}`}>
                        {district.party}
                    </Badge>
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-brand-muted font-medium text-sm">Racial Group</span>
                    <span className="text-brand-darkest font-semibold text-base">{district.racialGroup}</span>
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-brand-muted font-medium text-sm">Vote Margin</span>
                    {uncontested ? (
                        <span className="text-gray-400 text-base italic">Uncontested</span>
                    ) : (
                        <span className={`font-extrabold tabular-nums text-xl ${marginColor}`}>
                            {district.voteMarginDirection}+{(district.voteMarginPercentage * 100).toFixed(1)}%
                        </span>
                    )}
                </div>
                <Separator className="bg-brand-muted/20" />
                <p className="text-brand-muted/40 text-xs text-center">Click again to deselect</p>
            </CardContent>
        </Card>
    )
}

// ── Main section ──────────────────────────────────────────────────────

export default function StateOverviewSection({ data, stateId }) {
    const selectedDistrict     = useAppStore(s => s.selectedDistrict)

    const s = data?.stateSummary
    const d = data?.districtSummary
    const e = data?.ensembleSummary

    // Seat counts
    const demSeats = s?.congressionalRepresentatives?.byParty?.find(p => p.party === 'Democratic')?.seats ?? 0
    const repSeats = s?.congressionalRepresentatives?.byParty?.find(p => p.party === 'Republican')?.seats ?? 0
    const total    = s?.congressionalRepresentatives?.totalSeats ?? 0

    // Voter distribution
    const demVote  = s?.voterDistribution?.democraticVoteShare
    const repVote  = s?.voterDistribution?.republicanVoteShare
    const voteYear = s?.voterDistribution?.electionYear

    // District detail card data — driven by the same selectedDistrict Zustand value
    // that both the map click and table row click write to
    const selectedDistrictData = d?.districts?.find(dist => dist.districtNumber === selectedDistrict) ?? null

    return (
        <section id="state-overview" className="p-8 border-b border-brand-muted/30">

            {/* ── Header ───────────────────────────────────────────── */}
            <div className="flex items-start justify-between mb-6">
                <div>
                    <h2 className="text-3xl font-bold text-brand-darkest tracking-tight">State Overview</h2>
                    <p className="text-base text-brand-deep mt-1">
                        {s?.stateName ?? stateId} · {s?.numDistricts ?? '—'} Congressional Districts
                    </p>
                </div>
                {s?.isPreclearance && (
                    <Badge className="bg-brand-primary/10 text-brand-primary border-brand-primary/30 text-xs font-semibold mt-1">
                        VRA Preclearance Required
                    </Badge>
                )}
            </div>

            {/* ── GUI-3: Key stat cards ─────────────────────────────── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                <StatCard
                    label="Total Population"
                    value={s?.totalPopulation?.toLocaleString()}
                    sub="Census estimate"
                />
                <StatCard
                    label="Voting Age Pop."
                    value={s?.votingAgePopulation?.toLocaleString()}
                    sub="18+ residents"
                />
                <StatCard
                    label="Congressional Districts"
                    value={s?.numDistricts}
                    sub={`Ideal pop. ${s?.idealDistrictPopulation?.toLocaleString() ?? '—'}`}
                />
                <StatCard
                    label="Redistricting Control"
                    value={s?.redistrictingControl?.controllingParty}
                    sub="Controlling party"
                />
            </div>

            {/* ── GUI-3: Voter distribution + Seat distribution (side by side) ── */}
            <div className="grid grid-cols-2 gap-8 mb-8">

                {/* Voter distribution */}
                {demVote != null && repVote != null && (
                    <div>
                        <SectionHeader title={`${voteYear ?? ''} Statewide Voter Distribution`} />
                        <div className="flex items-center gap-4 flex-wrap">
                            <div className="flex items-center gap-2">
                                <span className="w-3 h-3 rounded-sm bg-blue-500 shrink-0" />
                                <span className="text-base text-gray-700 font-medium">Democratic</span>
                                <span className="text-2xl font-bold text-blue-600 tabular-nums ml-1">
                                    {(demVote * 100).toFixed(1)}%
                                </span>
                            </div>
                            <Separator orientation="vertical" className="h-6 bg-brand-muted/30" />
                            <div className="flex items-center gap-2">
                                <span className="w-3 h-3 rounded-sm bg-red-500 shrink-0" />
                                <span className="text-base text-gray-700 font-medium">Republican</span>
                                <span className="text-2xl font-bold text-red-600 tabular-nums ml-1">
                                    {(repVote * 100).toFixed(1)}%
                                </span>
                            </div>
                            <DistBar demPct={demVote * 100} repPct={repVote * 100} />
                        </div>
                    </div>
                )}

                {/* Seat distribution */}
                <div>
                    <SectionHeader title={`${d?.electionYear ?? ''} Congressional Seat Distribution`} />
                    <div className="flex items-center gap-4 flex-wrap">
                        <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-sm bg-blue-500 shrink-0" />
                            <span className="text-base text-gray-700 font-medium">Democratic</span>
                            <span className="text-2xl font-bold text-blue-600 tabular-nums ml-1">{demSeats}</span>
                            <span className="text-gray-400 text-sm">/ {total}</span>
                        </div>
                        <Separator orientation="vertical" className="h-6 bg-brand-muted/30" />
                        <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-sm bg-red-500 shrink-0" />
                            <span className="text-base text-gray-700 font-medium">Republican</span>
                            <span className="text-2xl font-bold text-red-600 tabular-nums ml-1">{repSeats}</span>
                            <span className="text-gray-400 text-sm">/ {total}</span>
                        </div>
                        {total > 0 && <DistBar demPct={(demSeats / total) * 100} repPct={(repSeats / total) * 100} />}
                    </div>
                </div>

            </div>

            {/* ── GUI-2 + GUI-6/7: 60% Map | 40% District detail card ─── */}
            <div className="mb-8">
                <SectionHeader title={`${d?.electionYear ?? 'Enacted'} District Plan`} />
                {/* Map legend */}
                <div className="flex items-center gap-4 mb-3 text-sm text-gray-500">
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
                <div className="grid h-[500px]" style={{ gridTemplateColumns: '60fr 40fr', gap: '1.25rem' }}>

                    {/* GUI-2: District map (full state visible via fitBounds) */}
                    <div className="rounded-xl overflow-hidden border border-brand-muted/25 shadow-sm">
                        <DistrictMap2022 stateId={stateId} districtSummary={d} />
                    </div>

                    {/* GUI-6/7: District detail card — updates from map click OR table row click */}
                    <DistrictDetailCard district={selectedDistrictData} />

                </div>
            </div>

            {/* ── GUI-6 + GUI-1: Congressional table (60%) | Ensemble summary (40%) ── */}
            <div className="mb-8 grid gap-6" style={{ gridTemplateColumns: '60fr 40fr' }}>
                <div>
                    <SectionHeader title={`${d?.electionYear ?? 'Enacted'} Congressional Districts`} />
                    <CongressionalTable districtSummary={d} />
                </div>
                <div>
                    <SectionHeader title="Ensemble Summary" />
                    <EnsembleSummaryTable ensembleSummary={e} />
                </div>
            </div>

            {/*
             * ── TODO: Demographic / Minority Table ──────────────────────────
             * StateSummaryTable (racial group VAP + Gingles feasibility) belongs
             * in DemographicSection.jsx alongside the precinct/census heatmap.
             *
             *   import StateSummaryTable from '../tables/StateSummaryTable'
             *   <StateSummaryTable stateSummary={data?.stateSummary} />
             * ─────────────────────────────────────────────────────────────── */}

        </section>
    )
}
