/**
 * RacialPolarizationSection.jsx — Third section on StatePage (id="racial-polarization").
 *
 * Fetch-on-demand strategy:
 *   Gingles    — GET /gingles?race=        on (stateId, feasibleRaceFilter) change
 *                Results cached in ginglesByRace map; re-used on tab revisit.
 *   EI KDE     — GET /ei?race=             for each race added to eiRaceFilter
 *                Results cached in eiKdeByRace map; only new races hit the server.
 *   EI Compare — GET /ei-compare?race1=&race2= on eiKdeCompareRaces pair change
 *   VS-SS      — GET /vote-seat-share      on stateId mount
 *
 * The server stores EI KDE race-first (one doc per race, all candidates).
 * We invert back to candidate-first here so EIKDEChart/EIBarChart receive the
 * same shape they always expected: candidate.racialGroups[].kdePoints.
 */

import { useState, useEffect, useMemo } from 'react'
import SectionHeader        from '@/components/ui/section-header'
import BrowserTabs          from '@/components/ui/browser-tabs'
import useAppStore          from '@/store/useAppStore'
import GinglesScatterPlot   from '@/components/charts/GinglesScatterPlot'
import GinglesPrecinctTable from '@/components/tables/GinglesPrecinctTable'
import EIKDEChart           from '@/components/charts/EIKDEChart'
import EIBarChart           from '@/components/charts/EIBarChart'
import EIKDECompareChart    from '@/components/charts/EIKDECompareChart'
import VoteSeatShareChart   from '@/components/charts/VoteSeatShareChart'
import { fetchGingles, fetchEiKde, fetchEiCompare, fetchVoteSeatShare } from '../../api'


export default function RacialPolarizationSection({ data, stateId }) {

    /* ── Zustand filters ─────────────────────────────────────────────────── */
    const feasibleRaceFilter = useAppStore(s => s.feasibleRaceFilter)
    const eiRaceFilter       = useAppStore(s => s.eiRaceFilter)
    const eiKdeCompareRaces  = useAppStore(s => s.eiKdeCompareRaces)
    const activeTab          = useAppStore(s => s.activeRPTab)
    const setActiveTab       = useAppStore(s => s.setActiveRPTab)

    /* ── Local selection state ───────────────────────────────────────────── */
    const [selectedId, setSelectedId] = useState(null)
    useEffect(() => { setSelectedId(null) }, [feasibleRaceFilter])

    /* ── Section-level fetched data ──────────────────────────────────────── */
    // ginglesByRace: { race → serverDoc } — cache; never cleared mid-session
    const [ginglesByRace,  setGinglesByRace]  = useState({})
    // eiKdeByRace: { race → serverDoc } — cache per race fetch
    const [eiKdeByRace,    setEiKdeByRace]    = useState({})
    // eiCompareDoc: single pair doc from server
    const [eiCompareDoc,   setEiCompareDoc]   = useState(null)
    // voteSeatData: VS-SS bundle
    const [voteSeatData,   setVoteSeatData]   = useState(null)

    /* Reset all on stateId change */
    useEffect(() => {
        setGinglesByRace({})
        setEiKdeByRace({})
        setEiCompareDoc(null)
        setVoteSeatData(null)
    }, [stateId])

    /* ── Fetch: Gingles — on (stateId, feasibleRaceFilter) ──────────────── */
    useEffect(() => {
        if (!stateId || !feasibleRaceFilter) return
        if (ginglesByRace[feasibleRaceFilter]) return  // already cached
        fetchGingles(stateId, feasibleRaceFilter)
            .then(doc => setGinglesByRace(prev => ({ ...prev, [feasibleRaceFilter]: doc })))
            .catch(err => console.error('[RP] fetchGingles error:', err))
    }, [stateId, feasibleRaceFilter])  // eslint-disable-line react-hooks/exhaustive-deps

    /* ── Fetch: EI KDE — one fetch per newly added race ─────────────────── */
    useEffect(() => {
        if (!stateId) return
        eiRaceFilter.forEach(race => {
            if (eiKdeByRace[race]) return  // already cached
            fetchEiKde(stateId, race)
                .then(doc => setEiKdeByRace(prev => ({ ...prev, [race]: doc })))
                .catch(err => console.error('[RP] fetchEiKde error:', err))
        })
    }, [stateId, eiRaceFilter])  // eslint-disable-line react-hooks/exhaustive-deps

    /* ── Fetch: EI Compare — on pair change ─────────────────────────────── */
    useEffect(() => {
        if (!stateId || eiKdeCompareRaces.length !== 2) return
        setEiCompareDoc(null)
        fetchEiCompare(stateId, eiKdeCompareRaces[0], eiKdeCompareRaces[1])
            .then(setEiCompareDoc)
            .catch(err => console.error('[RP] fetchEiCompare error:', err))
    }, [stateId, eiKdeCompareRaces])

    /* ── Fetch: Vote / Seat Share — on stateId mount ─────────────────────── */
    useEffect(() => {
        if (!stateId) return
        fetchVoteSeatShare(stateId)
            .then(setVoteSeatData)
            .catch(err => console.error('[RP] fetchVoteSeatShare error:', err))
    }, [stateId])

    /* ── Build candidate-first EI structure from race-first cache ─────────
     * Server returns race-first: each race doc has all candidates.
     * Charts expect candidate-first: each candidate has racialGroups[].
     * ─────────────────────────────────────────────────────────────────────── */
    const eiData = useMemo(() => {
        if (!Object.keys(eiKdeByRace).length) return null
        const candidateMap = {}
        Object.entries(eiKdeByRace).forEach(([race, doc]) => {
            doc.candidates.forEach(c => {
                if (!candidateMap[c.candidateId]) {
                    candidateMap[c.candidateId] = {
                        candidateId:   c.candidateId,
                        candidateName: c.candidateName,
                        party:         c.party,
                        racialGroups:  [],
                    }
                }
                candidateMap[c.candidateId].racialGroups.push({
                    group:                race,
                    peakSupportEstimate:  c.peakSupportEstimate,
                    confidenceIntervalLow:  c.confidenceIntervalLow,
                    confidenceIntervalHigh: c.confidenceIntervalHigh,
                    kdePoints:            c.kdePoints,
                })
            })
        })
        return { candidates: Object.values(candidateMap) }
    }, [eiKdeByRace])

    /* ── Build gingles adapted shape for GinglesScatterPlot ──────────────── */
    const ginglesAdapted = useMemo(() => {
        if (!Object.keys(ginglesByRace).length) return null
        return {
            feasibleSeriesByRace: Object.fromEntries(
                Object.entries(ginglesByRace).map(([race, doc]) => [race, {
                    points:               doc.points,
                    democraticTrendline:  doc.democraticTrendline,
                    republicanTrendline:  doc.republicanTrendline,
                    summaryRows:          doc.summaryRows,
                }])
            ),
        }
    }, [ginglesByRace])

    /* ── Derived ─────────────────────────────────────────────────────────── */
    const stateName = data?.stateSummary?.stateName ?? null

    const demCandidate = useMemo(
        () => eiData?.candidates?.find(c => c.party === 'Democratic') ?? null,
        [eiData]
    )
    const repCandidate = useMemo(
        () => eiData?.candidates?.find(c => c.party === 'Republican') ?? null,
        [eiData]
    )

    const eiYMax = useMemo(() => {
        if (!eiData) return 10
        let max = 0
        eiData.candidates.forEach(candidate => {
            candidate.racialGroups.forEach(group => {
                if (!eiRaceFilter.includes(group.group.toLowerCase())) return
                group.kdePoints.forEach(pt => { if (pt.y > max) max = pt.y })
            })
        })
        return Math.ceil(max * 1.1 * 10) / 10
    }, [eiData, eiRaceFilter])

    const isRaciallyPolarized = voteSeatData?.raciallyPolarized === true

    const RP_TABS = useMemo(() => [
        { id: 'gingles', label: 'Gingles Analysis'       },
        { id: 'ei-kde',  label: 'EI KDE Charts'          },
        { id: 'ei-bar',  label: 'EI Bar & Polarization'  },
        {
            id:            'vs-ss',
            label:         'Vote / Seat Share',
            disabled:      !isRaciallyPolarized,
            disabledTitle: 'Gingles 2/3 not satisfied — racially polarized voting not detected in this state',
        },
    ], [isRaciallyPolarized])

    /* Current gingles series for the precinct table */
    const currentGinglesSeries = ginglesByRace[feasibleRaceFilter] ?? null

    /* ── Render ──────────────────────────────────────────────────────────── */
    return (
        <section id="racial-polarization" className="p-2 sm:p-3 lg:p-4 border-b border-brand-muted/30 h-[calc(100vh-3.5rem)] flex flex-col overflow-hidden">

            <div className="flex items-baseline justify-between mb-3 shrink-0">
                <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-brand-darkest tracking-tight">
                    {stateName && <span className="text-brand-primary">{stateName} — </span>}Racial Polarization
                </h2>
                <span className="hidden sm:inline-flex items-center gap-1.5 text-sm italic font-medium text-brand-primary bg-brand-primary/10 border border-brand-primary/20 px-3 py-0.5 rounded-full">&ldquo;Do race and voting actually correlate?&rdquo;</span>
            </div>

            <BrowserTabs
                tabs={RP_TABS}
                activeTab={activeTab}
                onChange={setActiveTab}
                className="flex flex-col flex-1 min-h-0"
                panelClassName="flex-1 min-h-0 overflow-hidden p-5"
            >

                {/* ── GINGLES ─────────────────────────────────────────────── */}
                {activeTab === 'gingles' && (
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 h-full">
                        <div className="flex flex-col gap-3 min-h-0">
                            <SectionHeader title="Gingles Scatter Plot" />
                            <GinglesScatterPlot
                                ginglesData={ginglesAdapted}
                                raceFilter={feasibleRaceFilter}
                                selectedId={selectedId}
                                onDotClick={setSelectedId}
                                className="flex-1 min-h-0"
                            />
                        </div>
                        <div className="flex flex-col gap-3 min-h-0">
                            <SectionHeader title="Precinct Detail" />
                            <div className="flex-1 min-h-0">
                                <GinglesPrecinctTable
                                    points={currentGinglesSeries?.points ?? []}
                                    selectedId={selectedId}
                                    onSelectId={setSelectedId}
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* ── EI KDE ──────────────────────────────────────────────── */}
                {activeTab === 'ei-kde' && (
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 h-full">
                        <div className="flex flex-col gap-3 min-h-0">
                            <SectionHeader title="Democratic Support" />
                            <EIKDEChart
                                candidate={demCandidate}
                                activeRaces={eiRaceFilter}
                                yMax={eiYMax}
                                className="flex-1 min-h-0"
                            />
                        </div>
                        <div className="flex flex-col gap-3 min-h-0">
                            <SectionHeader title="Republican Support" />
                            <EIKDEChart
                                candidate={repCandidate}
                                activeRaces={eiRaceFilter}
                                yMax={eiYMax}
                                className="flex-1 min-h-0"
                            />
                        </div>
                    </div>
                )}

                {/* ── EI BAR + POLARIZATION KDE ───────────────────────────── */}
                {activeTab === 'ei-bar' && (
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 h-full">
                        <div className="flex flex-col gap-3 min-h-0">
                            <SectionHeader title="Peak Support Estimates" />
                            <EIBarChart
                                demCandidate={demCandidate}
                                repCandidate={repCandidate}
                                activeRaces={eiRaceFilter}
                                className="flex-1 min-h-0"
                            />
                        </div>
                        <div className="flex flex-col gap-3 min-h-0">
                            <SectionHeader title="Polarization KDE" />
                            <EIKDECompareChart
                                pairData={eiCompareDoc}
                                races={eiKdeCompareRaces}
                                threshold={eiCompareDoc?.differenceThreshold ?? 0.4}
                                className="flex-1 min-h-0"
                            />
                        </div>
                    </div>
                )}

                {/* ── VOTE / SEAT SHARE ───────────────────────────────────── */}
                {activeTab === 'vs-ss' && (
                    <div className="flex flex-col gap-3 h-full">
                        <SectionHeader title="Vote Share vs. Seat Share Curve" />
                        <VoteSeatShareChart
                            voteSeatData={voteSeatData}
                            className="flex-1 min-h-0"
                        />
                    </div>
                )}

            </BrowserTabs>

        </section>
    )
}
