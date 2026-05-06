
import { useState, useEffect, useRef, useMemo } from 'react'
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

/**
 * Renders the Racial Polarization section with three tabs:
 * Gingles scatter analysis, EI KDE charts, and EI bar + polarization comparison.
 * @param {object} data - State overview data containing stateSummary.
 * @param {string} stateId - State identifier used to fetch Gingles, EI, and vote-seat-share data.
 */
export default function RacialPolarizationSection({ data, stateId }) {

    const feasibleRaceFilter = useAppStore(s => s.feasibleRaceFilter)
    const eiRaceFilter       = useAppStore(s => s.eiRaceFilter)
    const eiKdeCompareRaces  = useAppStore(s => s.eiKdeCompareRaces)
    const activeTab          = useAppStore(s => s.activeRPTab)
    const setActiveTab       = useAppStore(s => s.setActiveRPTab)
    const activeSection      = useAppStore(s => s.activeSection)

    const inRP = activeSection === 'racial-polarization'

    const [selectedId, setSelectedId] = useState(null)
    useEffect(() => { setSelectedId(null) }, [feasibleRaceFilter])

    const [ginglesByRace,  setGinglesByRace]  = useState({})
    const [eiData,         setEiData]         = useState(null)
    const [eiCompareDoc,   setEiCompareDoc]   = useState(null)
    const [voteSeatData,   setVoteSeatData]   = useState(null)

    const hasVSSFetched = useRef(false)
    const hasEIFetched  = useRef(false)

    // Step 0: Reset all data when state changes
    useEffect(() => {
        setGinglesByRace({})
        setEiData(null)
        setEiCompareDoc(null)
        setVoteSeatData(null)
        hasVSSFetched.current = false
        hasEIFetched.current  = false
    }, [stateId])

    // Step 1: Fetch Gingles data for the selected race when on the Gingles tab
    useEffect(() => {
        if (!stateId || !feasibleRaceFilter) return
        if (!inRP || activeTab !== 'gingles') return
        if (ginglesByRace[feasibleRaceFilter]) return
        fetchGingles(stateId, feasibleRaceFilter)
            .then(doc => setGinglesByRace(prev => ({ ...prev, [feasibleRaceFilter]: doc })))
            .catch(err => console.error('[RP] fetchGingles error:', err))
    }, [stateId, feasibleRaceFilter, inRP, activeTab])

    // Step 2: Fetch EI KDE data once when entering either EI tab
    useEffect(() => {
        if (!stateId) return
        if (!inRP || (activeTab !== 'ei-kde' && activeTab !== 'ei-bar')) return
        if (hasEIFetched.current) return
        hasEIFetched.current = true
        fetchEiKde(stateId)
            .then(setEiData)
            .catch(err => console.error('[RP] fetchEiKde error:', err))
    }, [stateId, inRP, activeTab])  // eslint-disable-line react-hooks/exhaustive-deps

    // Step 3: Fetch EI compare doc when race pair or tab changes
    useEffect(() => {
        if (!stateId || eiKdeCompareRaces.length !== 2) return
        if (!inRP || activeTab !== 'ei-bar') return
        setEiCompareDoc(null)
        fetchEiCompare(stateId, eiKdeCompareRaces[0], eiKdeCompareRaces[1])
            .then(setEiCompareDoc)
            .catch(err => console.error('[RP] fetchEiCompare error:', err))
    }, [stateId, eiKdeCompareRaces, inRP, activeTab])

    // Step 4: Fetch vote-seat-share once on first entry to this section
    useEffect(() => {
        if (!stateId || !inRP) return
        if (hasVSSFetched.current) return
        hasVSSFetched.current = true
        fetchVoteSeatShare(stateId)
            .then(setVoteSeatData)
            .catch(err => console.error('[RP] fetchVoteSeatShare error:', err))
    }, [stateId, inRP])

    // Step 5: Adapt per-race Gingles docs into the shape GinglesScatterPlot expects
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


    const stateName = data?.stateSummary?.stateName ?? null
    const demCandidate = useMemo(
        () => eiData?.candidates?.find(c => c.party === 'Democratic') ?? null,
        [eiData]
    )
    const repCandidate = useMemo(
        () => eiData?.candidates?.find(c => c.party === 'Republican') ?? null,
        [eiData]
    )

    // Step 6: Compute shared Y-axis max across all visible EI KDE curves
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

    const RP_TABS = useMemo(() => [
        { id: 'gingles', label: 'Gingles Analysis'       },
        { id: 'ei-kde',  label: 'EI KDE Charts'          },
        { id: 'ei-bar',  label: 'EI Bar & Polarization'  },
    ], [])

    const currentGinglesSeries = ginglesByRace[feasibleRaceFilter] ?? null

    // Step 7: Render tabbed layout with chart/table pairs per tab
    return (
        <section id="racial-polarization" className="p-2 sm:p-3 lg:p-4 border-b border-brand-muted/30 h-[calc(100vh-3.5rem)] flex flex-col overflow-hidden">

            <div className="flex items-baseline justify-between mb-3 shrink-0">
                <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-brand-darkest tracking-tight">
                    Racial Polarization
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
                {/* Gingles Section */}
                {activeTab === 'gingles' && (
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 h-full">
                        <div className="flex flex-col gap-3 min-h-0">
                            <SectionHeader title="Gingles Scatter Plot" />
                            {/* Gingles Scatter Plot */}
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
                                {/* Gingles Precinct Table */}
                                <GinglesPrecinctTable
                                    points={currentGinglesSeries?.points ?? []}
                                    selectedId={selectedId}
                                    onSelectId={setSelectedId}
                                />
                            </div>
                        </div>
                    </div>
                )}
                {/* EI KDE Section */}
                {activeTab === 'ei-kde' && (
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 h-full">
                        <div className="flex flex-col gap-3 min-h-0">
                            <SectionHeader title="Democratic Support" />
                            {/* EI KDE Chart — Democratic Candidate */}
                            <EIKDEChart
                                candidate={demCandidate}
                                activeRaces={eiRaceFilter}
                                yMax={eiYMax}
                                className="flex-1 min-h-0"
                            />
                        </div>
                        <div className="flex flex-col gap-3 min-h-0">
                            <SectionHeader title="Republican Support" />
                            {/* EI KDE Chart — Republican Candidate */}
                            <EIKDEChart
                                candidate={repCandidate}
                                activeRaces={eiRaceFilter}
                                yMax={eiYMax}
                                className="flex-1 min-h-0"
                            />
                        </div>
                    </div>
                )}
                {/* EI Bar/Compare Section */}
                {activeTab === 'ei-bar' && (
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 h-full">
                        <div className="flex flex-col gap-3 min-h-0">
                            <SectionHeader title="Peak Support Estimates" />
                            {/* EI Bar Chart */}
                            <EIBarChart
                                demCandidate={demCandidate}
                                repCandidate={repCandidate}
                                activeRaces={eiRaceFilter}
                                className="flex-1 min-h-0"
                            />
                        </div>
                        <div className="flex flex-col gap-3 min-h-0">
                            <SectionHeader title="Polarization KDE" />
                            {/* EI KDE Compare Chart */}
                            <EIKDECompareChart
                                pairData={eiCompareDoc}
                                races={eiKdeCompareRaces}
                                threshold={eiCompareDoc?.differenceThreshold ?? 0.4}
                                className="flex-1 min-h-0"
                            />
                        </div>
                    </div>
                )}


            </BrowserTabs>

        </section>
    )
}
