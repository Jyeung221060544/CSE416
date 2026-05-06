
import React from 'react'
import { MapPin, ArrowLeft } from 'lucide-react'
import { Badge }               from '@/components/ui/badge'
import { Button }              from '@/components/ui/button'
import { Separator }           from '@/components/ui/separator'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import SectionHeader           from '@/components/ui/section-header'
import MapFrame                from '@/components/ui/map-frame'
import InfoCallout             from '@/components/ui/info-callout'
import { PARTY_BADGE, DEM_TEXT, REP_TEXT } from '@/lib/partyColors'
import useAppStore                from '@/store/useAppStore'
import DistrictMap2024            from '@/components/maps/DistrictMap2024'
import CongressionalTable         from '@/components/tables/CongressionalTable'
import EnsembleSummaryTable       from '@/components/tables/EnsembleSummaryTable'
import DemographicPopulationTable from '@/components/tables/DemographicPopulationTable'


const OVERVIEW_TABS = [
    { id: 'state-stats',   label: 'State Stats'                 },
    { id: 'congressional', label: 'District Stats' },
    { id: 'ensemble-demo', label: 'Ensemble/Demographic Stats' },
]

/**
 * Small summary card displaying a single labeled stat value.
 * @param {string} label - Card title text.
 * @param {string|number} value - Primary stat value to display.
 * @param {string} [sub] - Optional subtitle/sub-label text.
 */
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

/**
 * Horizontal Dem/Rep seat or vote distribution bar.
 * @param {number} demPct - Democratic percentage (0–100).
 * @param {number} repPct - Republican percentage (0–100).
 */
function DistBar({ demPct, repPct }) {
    return (
        <div className="flex h-3 w-full rounded-full overflow-hidden">
            <div className="bg-blue-500" style={{ width: `${demPct}%` }} />
            <div className="bg-red-500"  style={{ width: `${repPct}%` }} />
        </div>
    )
}

/**
 * Detail panel for the currently selected congressional district,
 * or an empty-state prompt when no district is selected.
 * @param {object|null} district - District object from districtSummary, or null.
 */
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
                            Click a row in the table below to view its details.
                        </p>
                    </div>
                </CardContent>
            </Card>
        )
    }

    const isUncontested = district.voteMarginPercentage >= 1.0
    const marginCls     = district.voteMarginDirection === 'D' ? DEM_TEXT : REP_TEXT
    const marginLabel   = `${district.voteMarginDirection}+${isUncontested ? '100' : (district.voteMarginPercentage * 100).toFixed(1)}%`
    const isEffective   = district.isEffective ?? false

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
                    <span className="text-brand-muted font-medium text-sm">Effectiveness Score</span>
                    <span className={`text-xl font-bold tabular-nums ${isEffective ? 'text-green-600' : 'text-brand-muted/40'}`}>
                        {isEffective ? '1' : '0'}
                    </span>
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

/**
 * Renders the State Overview section with a district map and a tabbed panel
 * showing state stats, congressional district details, or ensemble/demographic summaries.
 * @param {object} data - State overview data containing stateSummary, districtSummary, and ensembleSummary.
 * @param {string} stateId - State identifier.
 */
export default function StateOverviewSection({ data, stateId }) {

    const selectedDistrict    = useAppStore(s => s.selectedDistrict)
    const setSelectedDistrict = useAppStore(s => s.setSelectedDistrict)
    const raceFilter          = useAppStore(s => s.raceFilter)
    const setRaceFilter       = useAppStore(s => s.setRaceFilter)

    const activeTab    = useAppStore(s => s.activeSOTab)
    const setActiveTab = useAppStore(s => s.setActiveSOTab)

    const stateData         = data?.stateSummary
    const districtData      = data?.districtSummary
    const demographicGroups = stateData?.demographicGroups ?? []

    const demSeats = stateData?.congressionalRepresentatives?.byParty?.find(p => p.party === 'Democratic')?.seats ?? 0
    const repSeats = stateData?.congressionalRepresentatives?.byParty?.find(p => p.party === 'Republican')?.seats ?? 0
    const total    = stateData?.congressionalRepresentatives?.totalSeats ?? 0

    const demVote  = stateData?.voterDistribution?.democraticVoteShare
    const repVote  = stateData?.voterDistribution?.republicanVoteShare
    const voteYear = stateData?.voterDistribution?.electionYear

    const selectedDistrictData = districtData?.districts?.find(d => d.districtNumber === selectedDistrict) ?? null


    return (
        <section id="state-overview" className="p-2 sm:p-3 lg:p-4 border-b border-brand-muted/30 h-[calc(100vh-3.5rem)] flex flex-col overflow-hidden">

            <div className="flex items-baseline justify-between mb-3 shrink-0">
                <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-brand-darkest tracking-tight">
                    State Overview
                </h2>
                <span className="hidden sm:inline-flex items-center gap-1.5 text-sm italic font-medium text-brand-primary bg-brand-primary/10 border border-brand-primary/20 px-3 py-0.5 rounded-full">&ldquo;Who are we looking at?&rdquo;</span>
            </div>

            <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2 lg:gap-x-5 lg:grid-rows-[auto_1fr]">

                <div className="order-1 flex items-center gap-4 text-sm text-brand-muted/70 pb-2">
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

                {(selectedDistrict && activeTab !== 'congressional') ? (
                    <div
                        className="order-3 lg:order-2 flex items-end pb-1"
                        style={{ borderBottom: '2px solid rgba(89,90,150,0.55)' }}
                    >
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedDistrict(null)}
                            className="mb-0.5 flex items-center gap-1.5 text-brand-deep hover:text-brand-darkest"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Return to {OVERVIEW_TABS.find(t => t.id === activeTab)?.label}
                        </Button>
                    </div>
                ) : (
                <div
                    className="order-3 lg:order-2"
                    style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', borderBottom: '2px solid rgba(89,90,150,0.55)', paddingLeft: '2px' }}
                >
                    {OVERVIEW_TABS.map(tab => {
                        const isActive = tab.id === activeTab
                        return (
                            <button
                                key={tab.id}
                                onClick={() => { setActiveTab(tab.id); if (tab.id !== 'congressional') setSelectedDistrict(null) }}
                                style={{
                                    borderRadius: '8px 8px 0 0',
                                    padding: isActive ? '8px 22px 9px' : '6px 20px 7px',
                                    border: `2px solid ${isActive ? 'rgba(89,90,150,0.55)' : '#8f87c0'}`,
                                    borderBottom: isActive ? '2px solid #f4f1ff' : '2px solid #8f87c0',
                                    background: isActive ? '#f4f1ff' : '#ddd7f5',
                                    color: isActive ? '#2e2a6e' : '#6b64a0',
                                    marginBottom: isActive ? '-2px' : '0',
                                    position: 'relative',
                                    zIndex: isActive ? 2 : 1,
                                    fontSize: 12,
                                    fontWeight: 700,
                                    letterSpacing: '0.02em',
                                    whiteSpace: 'nowrap',
                                    cursor: 'pointer',
                                    transition: 'background 120ms, color 120ms',
                                    boxShadow: isActive ? '0 -3px 8px rgba(89,90,150,0.15)' : 'none',
                                }}
                                onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = '#ece7ff' }}
                                onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = '#ddd7f5' }}
                            >
                                {tab.label}
                            </button>
                        )
                    })}
                </div>
                )}

                <MapFrame className="h-[340px] sm:h-[420px] lg:h-full order-2 lg:order-3">
                    {/* District Map */}
                    <DistrictMap2024 stateId={stateId} districtSummary={districtData} />
                </MapFrame>

                <div
                    className="order-4 h-[340px] sm:h-[420px] lg:h-full overflow-hidden"
                    style={{
                        background: '#f4f1ff',
                        border: '2px solid rgba(89,90,150,0.55)',
                        borderTop: 'none',
                        borderRadius: '0 0 12px 12px',
                        position: 'relative',
                        zIndex: 1,
                        boxShadow: '0 4px 16px rgba(89,90,150,0.10)',
                    }}
                >
                    {(selectedDistrict && activeTab !== 'congressional') ? (
                        <div className="h-full p-3">
                            {/* District Detail Card */}
                            <DistrictDetailCard district={selectedDistrictData} />
                        </div>
                    ) : (
                        <div className="h-full">

                            {activeTab === 'state-stats' && (
                                <div className="flex flex-col gap-4 h-full overflow-hidden px-4 pt-3 pb-2">

                                    {/* State Stat Cards */}
                                    <div className="grid grid-cols-2 gap-3 shrink-0">
                                        <StatCard label="Total Population"  value={stateData?.totalPopulation?.toLocaleString()} />
                                        <StatCard label="Voting Age Pop."   value={stateData?.votingAgePopulation?.toLocaleString()} />
                                        <StatCard label="Districts"         value={stateData?.numDistricts} />
                                        <StatCard label="Controlling Party" value={stateData?.redistrictingControl?.controllingParty} />
                                    </div>

                                    {demVote != null && repVote != null && (
                                        <div className="shrink-0">
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
                                                {/* Voter Distribution Bar */}
                                                <DistBar demPct={demVote * 100} repPct={repVote * 100} />
                                            </div>
                                        </div>
                                    )}

                                    <div className="shrink-0">
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
                                            {/* Seat Distribution Bar */}
                                            {total > 0 && <DistBar demPct={(demSeats / total) * 100} repPct={(repSeats / total) * 100} />}
                                        </div>
                                    </div>

                                </div>
                            )}

                            {activeTab === 'congressional' && (
                                <div className="h-full overflow-hidden px-3 pt-2">
                                    <SectionHeader title={`${districtData?.electionYear ?? 'Enacted'} Congressional Districts`} />
                                    {/* Congressional Table */}
                                    <CongressionalTable districtSummary={districtData} />
                                </div>
                            )}

                            {activeTab === 'ensemble-demo' && (
                                <div className="flex flex-col gap-3 overflow-hidden px-3 pt-2 pb-2">
                                    <div>
                                        <SectionHeader title="Ensemble Summary" />
                                        {/* Ensemble Summary Table */}
                                        <EnsembleSummaryTable ensembleSummary={data?.ensembleSummary ?? null} />
                                    </div>
                                    <div>
                                        <SectionHeader title="Population By Group" />
                                        {/* Demographic Population Table (read-only) */}
                                        <DemographicPopulationTable
                                            demographicGroups={demographicGroups}
                                            raceFilter={raceFilter}
                                            setRaceFilter={setRaceFilter}
                                            districtSummary={districtData}
                                            numDistricts={stateData?.numDistricts}
                                            readOnly
                                        />
                                    </div>
                                </div>
                            )}

                        </div>
                    )}
                </div>


            </div>

        </section>
    )
}
