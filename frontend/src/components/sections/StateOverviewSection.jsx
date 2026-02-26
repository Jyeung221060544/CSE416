/**
 * StateOverviewSection.jsx — First section on StatePage (id="state-overview").
 *
 * LAYOUT
 *   ┌──────────────────────────────────┬───────────────────────────────────┐
 *   │  DistrictMap2024                 │  [State Summary] [Congressional]  │
 *   │  (interactive choropleth)        │   [Ensemble & Demographic]        │
 *   │                                  │  ───────────────────────────────  │
 *   │                                  │  Tabbed right panel (no scroll):  │
 *   │                                  │  · State Summary        (default) │
 *   │                                  │  · Congressional District Summary │
 *   │                                  │  · Ensemble & Demographic Summary │
 *   │                                  │                                   │
 *   │                                  │  OR — when a district is clicked: │
 *   │                                  │  · "Return to <tab>" back button  │
 *   │                                  │  · DistrictDetailCard             │
 *   └──────────────────────────────────┴───────────────────────────────────┘
 *
 * PROPS
 *   data    {object|null} — Full state data bundle from useStateData.
 *   stateId {string}      — Two-letter state abbreviation (e.g. 'AL').
 *
 * STATE SOURCES
 *   selectedDistrict / setSelectedDistrict — Zustand; district number (1-based int).
 *   raceFilter / setRaceFilter             — Zustand; active race for population table.
 *   activeSOTab / setActiveSOTab           — Zustand; active mini-nav tab; also drives
 *                                            the SectionPanel SO sub-nav highlight.
 */

import { MapPin, ArrowLeft, MousePointerClick } from 'lucide-react'
import { Badge }               from '@/components/ui/badge'
import { Button }              from '@/components/ui/button'
import { Separator }           from '@/components/ui/separator'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import SectionHeader           from '@/components/ui/section-header'
import MapFrame                from '@/components/ui/map-frame'
import InfoCallout             from '@/components/ui/info-callout'
import MiniNavTabs             from '@/components/ui/mini-nav-tabs'
import { PARTY_BADGE, DEM_TEXT, REP_TEXT } from '@/lib/partyColors'
import useAppStore                  from '../../store/useAppStore'
import DistrictMap2024              from '../maps/DistrictMap2024'
import CongressionalTable           from '../tables/CongressionalTable'
import EnsembleSummaryTable         from '../tables/EnsembleSummaryTable'
import DemographicPopulationTable   from '../tables/DemographicPopulationTable'


/* ── Tab definitions ─────────────────────────────────────────────────────────
 * ids must match the SO_SUBSECTIONS ids in SectionPanel and the activeSOTab
 * values in useAppStore so the sidebar sub-nav and pills stay in sync.
 * ─────────────────────────────────────────────────────────────────────────── */

const OVERVIEW_TABS = [
    { id: 'state-stats',   label: 'State Summary'                 },
    { id: 'congressional', label: 'Congressional District Summary' },
    { id: 'ensemble-demo', label: 'Ensemble & Demographic Summary' },
]


/* ── Step 0: Sub-components ──────────────────────────────────────────────── */

/**
 * StatCard — Small summary tile with a label, primary value, and optional subtitle.
 *
 * @param {{ label: string, value: string|number|null, sub?: string }} props
 *   label — Short uppercase key shown in tiny text.
 *   value — Main display value (e.g. population, district count). Renders '—' if null.
 *   sub   — Optional secondary line shown below value in muted smaller text.
 * @returns {JSX.Element}
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
 * DistBar — Horizontal stacked bar showing Democratic vs Republican share.
 *
 * @param {{ demPct: number, repPct: number }} props
 *   demPct — Democratic percentage (0–100); controls the blue segment width.
 *   repPct — Republican percentage (0–100); controls the red segment width.
 * @returns {JSX.Element}
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
 * DistrictDetailCard — Right-panel card displaying a single district's details.
 *
 * Renders an empty-state prompt if no district is selected.
 * Sourced from: districtData.districts[n] filtered by districtNumber === selectedDistrict.
 *
 * @param {{ district: object|null }} props
 *   district — District record from districtSummary.districts, or null if none selected.
 *              Fields: districtNumber, representative, party, racialGroup,
 *                      voteMarginPercentage, voteMarginDirection.
 * @returns {JSX.Element}
 */
function DistrictDetailCard({ district }) {

    /* ── Empty state — no district selected yet ── */
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

    /* ── Derive display values from raw district data ── */
    const isUncontested = district.voteMarginPercentage >= 1.0
    const marginCls     = district.voteMarginDirection === 'D' ? DEM_TEXT : REP_TEXT
    const marginLabel   = `${district.voteMarginDirection}+${isUncontested ? '100' : (district.voteMarginPercentage * 100).toFixed(1)}%`

    /* ── Populated district card ── */
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


/* ── Step 1: Main exported section component ─────────────────────────────── */

/**
 * StateOverviewSection — Top section of StatePage.
 *
 * The right panel is a fixed-height tabbed container (no viewport scrolling).
 * Selecting a district swaps the panel to a detail card; the back button
 * restores the tab that was active when the district was clicked.
 *
 * @param {{ data: object|null, stateId: string }} props
 *   data    — Full state data bundle (stateSummary, districtSummary, ensembleSummary, …).
 *   stateId — Two-letter abbreviation for the current state (e.g. 'AL').
 * @returns {JSX.Element}
 */
export default function StateOverviewSection({ data, stateId }) {

    /* ── Step 2: Zustand state ────────────────────────────────────────────── */
    const selectedDistrict    = useAppStore(s => s.selectedDistrict)
    const setSelectedDistrict = useAppStore(s => s.setSelectedDistrict)
    const raceFilter          = useAppStore(s => s.raceFilter)
    const setRaceFilter       = useAppStore(s => s.setRaceFilter)


    /* ── Step 3: Tab state (global — mirrors sidebar sub-nav) ───────────── */
    const activeTab    = useAppStore(s => s.activeSOTab)
    const setActiveTab = useAppStore(s => s.setActiveSOTab)


    /* ── Step 4: Derived data slices from the state bundle ───────────────── */
    const stateData         = data?.stateSummary
    const districtData      = data?.districtSummary
    const ensembleData      = data?.ensembleSummary
    const demographicGroups = stateData?.demographicGroups ?? []

    /* Congressional seat breakdown */
    const demSeats = stateData?.congressionalRepresentatives?.byParty?.find(p => p.party === 'Democratic')?.seats ?? 0
    const repSeats = stateData?.congressionalRepresentatives?.byParty?.find(p => p.party === 'Republican')?.seats ?? 0
    const total    = stateData?.congressionalRepresentatives?.totalSeats ?? 0

    /* Voter distribution percentages */
    const demVote  = stateData?.voterDistribution?.democraticVoteShare
    const repVote  = stateData?.voterDistribution?.republicanVoteShare
    const voteYear = stateData?.voterDistribution?.electionYear

    /* Full district record for the currently-selected district number */
    const selectedDistrictData = districtData?.districts?.find(d => d.districtNumber === selectedDistrict) ?? null


    /* ── Step 5: Render ──────────────────────────────────────────────────── */
    return (
        <section id="state-overview" className="p-4 sm:p-6 lg:p-8 border-b border-brand-muted/30 min-h-[calc(100vh-3.5rem)]">

            {/* ── SECTION HEADER ───────────────────────────────────────────── */}
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-brand-darkest tracking-tight mb-3">State Overview</h2>

            {/* ── MAP LEGEND + MINI NAV ────────────────────────────────────── */}
            {/* Legend items on the left, pills right-aligned — same visual row. */}
            <div className="flex items-center justify-between mb-3 gap-4">
                <div className="flex items-center gap-4 text-sm text-brand-muted/70">
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
                <MiniNavTabs
                    tabs={OVERVIEW_TABS}
                    activeTab={activeTab}
                    onChange={setActiveTab}
                />
            </div>

            {/* ── MAP | TABBED RIGHT PANEL ──────────────────────────────────── */}
            {/* Left: interactive district choropleth (unchanged).
                Right: fixed-height tabbed panel — pills nav + swappable content.
                Both columns share the same explicit height so they align. */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

                {/* ── DISTRICT MAP ─────────────────────────────────────────── */}
                <MapFrame className="h-[340px] sm:h-[420px] lg:h-[520px]">
                    <DistrictMap2024 stateId={stateId} districtSummary={districtData} />
                </MapFrame>

                {/* ── RIGHT PANEL ──────────────────────────────────────────── */}
                {/* Fixed height matches the map. overflow-hidden clips excess
                    content cleanly — no scrollbars anywhere in this panel. */}
                <div className="flex flex-col h-[340px] sm:h-[420px] lg:h-[520px] overflow-hidden">

                    {selectedDistrict ? (

                        /* ── DISTRICT DETAIL MODE ──────────────────────────── */
                        /* Back button reflects the currently active tab label. */
                        <div className="flex flex-col h-full gap-3">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedDistrict(null)}
                                className="self-start flex items-center gap-1.5 text-brand-deep hover:text-brand-darkest shrink-0"
                            >
                                <ArrowLeft className="w-4 h-4" />
                                Return to {OVERVIEW_TABS.find(t => t.id === activeTab)?.label}
                            </Button>
                            <div className="flex-1 min-h-0">
                                <DistrictDetailCard district={selectedDistrictData} />
                            </div>
                        </div>

                    ) : (

                        /* ── TABBED PANEL MODE ─────────────────────────────── */
                        /* Pills live in the section header above; full panel
                           height is given entirely to tab content. */
                        <div className="h-full overflow-hidden">

                            {/* ── STATE SUMMARY ───────────────────────────── */}
                            {activeTab === 'state-stats' && (
                                <div className="flex flex-col gap-4 h-full overflow-hidden">

                                    {/* 2×2 quick-glance stat tiles */}
                                    <div className="grid grid-cols-2 gap-3 shrink-0">
                                        <StatCard label="Total Population"  value={stateData?.totalPopulation?.toLocaleString()} />
                                        <StatCard label="Voting Age Pop."   value={stateData?.votingAgePopulation?.toLocaleString()} />
                                        <StatCard label="Districts"         value={stateData?.numDistricts} />
                                        <StatCard label="Controlling Party" value={stateData?.redistrictingControl?.controllingParty} />
                                    </div>

                                    {/* Voter share distribution */}
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
                                                <DistBar demPct={demVote * 100} repPct={repVote * 100} />
                                            </div>
                                        </div>
                                    )}

                                    {/* Congressional seat breakdown */}
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
                                            {total > 0 && <DistBar demPct={(demSeats / total) * 100} repPct={(repSeats / total) * 100} />}
                                        </div>
                                    </div>

                                    {/* Interaction hint */}
                                    <InfoCallout icon={MousePointerClick} className="mt-auto shrink-0">
                                        Click a district on the map or switch to District Summary to select one and view its details here.
                                    </InfoCallout>
                                </div>
                            )}

                            {/* ── DISTRICT SUMMARY ────────────────────────── */}
                            {activeTab === 'congressional' && (
                                <div className="h-full overflow-hidden">
                                    <SectionHeader title={`${districtData?.electionYear ?? 'Enacted'} Congressional Districts`} />
                                    <CongressionalTable districtSummary={districtData} />
                                </div>
                            )}

                            {/* ── ENSEMBLE & DEMOGRAPHIC ──────────────────── */}
                            {activeTab === 'ensemble-demo' && (
                                <div className="flex flex-col gap-3 overflow-hidden">
                                    <div>
                                        <SectionHeader title="Ensemble Summary" />
                                        <EnsembleSummaryTable ensembleSummary={ensembleData} />
                                    </div>
                                    <div>
                                        <SectionHeader title="Population By Group" />
                                        <DemographicPopulationTable
                                            demographicGroups={demographicGroups}
                                            raceFilter={raceFilter}
                                            setRaceFilter={setRaceFilter}
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
