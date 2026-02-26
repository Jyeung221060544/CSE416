/**
 * RacialPolarizationSection.jsx — Third section on StatePage (id="racial-polarization").
 *
 * LAYOUT
 *   ┌─────────────────────────────────────────────────────────────────────┐
 *   │  Racial Polarization                [Gingles Analysis] [EI KDE Charts] [EI Bar Charts] │
 *   ├─────────────────────────────────────────────────────────────────────┤
 *   │  Full-width tab content (swaps entire section body):               │
 *   │  · Gingles Analysis  — Scatter plot + Precinct Detail table        │
 *   │  · EI KDE Charts     — Democratic Support KDE + Republican Support KDE │
 *   │  · EI Bar Charts     — Peak Support Estimates bar chart            │
 *   └─────────────────────────────────────────────────────────────────────┘
 *
 * PROPS
 *   data    {object|null} — Full state bundle; uses ginglesPrecinct and ei sub-keys.
 *   stateId {string}      — Two-letter abbreviation for the current state (e.g. 'AL').
 *
 * STATE SOURCES (Zustand)
 *   feasibleRaceFilter — Selected race for the Gingles scatter series.
 *   eiRaceFilter       — Array of races shown as overlay lines in EI KDE + bar charts.
 *   activeRPTab        — Active mini-nav tab; also drives the SectionPanel RP sub-nav
 *                        highlight and the FilterPanel filter selection.
 */

import { useState, useEffect, useMemo } from 'react'
import SectionHeader        from '@/components/ui/section-header'
import MiniNavTabs          from '@/components/ui/mini-nav-tabs'
import useAppStore          from '../../store/useAppStore'
import GinglesScatterPlot   from '../charts/GinglesScatterPlot'
import GinglesPrecinctTable from '../tables/GinglesPrecinctTable'
import EIKDEChart           from '../charts/EIKDEChart'
import EIBarChart           from '../charts/EIBarChart'


/* ── Tab definitions ─────────────────────────────────────────────────────── */

const RP_TABS = [
    { id: 'gingles', label: 'Gingles Analysis' },
    { id: 'ei-kde',  label: 'EI KDE Charts'    },
    { id: 'ei-bar',  label: 'EI Bar Charts'    },
]


/**
 * RacialPolarizationSection — Tabbed Gingles + Ecological Inference section.
 *
 * The mini nav bar at the top swaps the entire section body between the three
 * sub-views. No scrolling between sub-sections; each view is self-contained.
 *
 * @param {{ data: object|null }} props
 * @returns {JSX.Element}
 */
export default function RacialPolarizationSection({ data }) {

    /* ── Zustand filter state ─────────────────────────────────────────────── */
    const feasibleRaceFilter = useAppStore(s => s.feasibleRaceFilter)
    const eiRaceFilter       = useAppStore(s => s.eiRaceFilter)

    /* ── Tab state (global — mirrors sidebar sub-nav) ───────────────────── */
    const activeTab    = useAppStore(s => s.activeRPTab)
    const setActiveTab = useAppStore(s => s.setActiveRPTab)

    /* ── Derived data ────────────────────────────────────────────────────── */
    const ginglesPrecinct = data?.ginglesPrecinct ?? null
    const eiData          = data?.ei ?? null
    const series          = ginglesPrecinct?.feasibleSeriesByRace?.[feasibleRaceFilter] ?? null

    /* Dot / row selection — local to this section, reset on race filter change */
    const [selectedId, setSelectedId] = useState(null)
    useEffect(() => { setSelectedId(null) }, [feasibleRaceFilter])

    /* Democratic / Republican candidate entries from the EI dataset */
    const demCandidate = useMemo(
        () => eiData?.candidates?.find(c => c.party === 'Democratic') ?? null,
        [eiData]
    )
    const repCandidate = useMemo(
        () => eiData?.candidates?.find(c => c.party === 'Republican') ?? null,
        [eiData]
    )

    /*
     * eiYMax — Shared y-axis ceiling for both KDE charts (same scale).
     * Derived from the highest density across all selected races + 10% headroom.
     */
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


    /* ── Render ──────────────────────────────────────────────────────────── */
    return (
        <section id="racial-polarization" className="p-4 sm:p-6 lg:p-8 border-b border-brand-muted/30 min-h-[calc(100vh-3.5rem)]">

            {/* ── SECTION HEADER + MINI NAV ──────────────────────────────── */}
            <div className="flex items-end justify-between mb-4 gap-4">
                <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-brand-darkest tracking-tight shrink-0">
                    Racial Polarization
                </h2>
                <MiniNavTabs
                    tabs={RP_TABS}
                    activeTab={activeTab}
                    onChange={setActiveTab}
                />
            </div>

            {/* ── GINGLES ANALYSIS ───────────────────────────────────────── */}
            {/* Scatter plot of precinct minority VAP % vs Dem vote share,
                cross-linked with the precinct detail table via selectedId. */}
            {activeTab === 'gingles' && (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
                    <div className="flex flex-col gap-3">
                        <SectionHeader title="Gingles Scatter Plot" />
                        <GinglesScatterPlot
                            ginglesData={ginglesPrecinct}
                            raceFilter={feasibleRaceFilter}
                            selectedId={selectedId}
                            onDotClick={setSelectedId}
                            className="h-[480px]"
                        />
                    </div>
                    <div className="flex flex-col gap-3">
                        <SectionHeader title="Precinct Detail" />
                        <GinglesPrecinctTable
                            points={series?.points ?? []}
                            selectedId={selectedId}
                            onSelectId={setSelectedId}
                        />
                    </div>
                </div>
            )}

            {/* ── EI KDE CHARTS ──────────────────────────────────────────── */}
            {/* Dual KDE density charts sharing a y-axis for direct comparison. */}
            {activeTab === 'ei-kde' && (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
                    <div className="flex flex-col gap-3">
                        <SectionHeader title="Democratic Support" />
                        <EIKDEChart
                            candidate={demCandidate}
                            activeRaces={eiRaceFilter}
                            yMax={eiYMax}
                            className="h-[calc(100vh-13rem)]"
                        />
                    </div>
                    <div className="flex flex-col gap-3">
                        <SectionHeader title="Republican Support" />
                        <EIKDEChart
                            candidate={repCandidate}
                            activeRaces={eiRaceFilter}
                            yMax={eiYMax}
                            className="h-[calc(100vh-13rem)]"
                        />
                    </div>
                </div>
            )}

            {/* ── EI BAR CHARTS ──────────────────────────────────────────── */}
            {/* Peak support estimates with confidence intervals per racial group. */}
            {activeTab === 'ei-bar' && (
                <div className="flex flex-col gap-3">
                    <SectionHeader title="Peak Support Estimates" />
                    <EIBarChart
                        demCandidate={demCandidate}
                        repCandidate={repCandidate}
                        activeRaces={eiRaceFilter}
                        className="h-[calc(100vh-13rem)]"
                    />
                </div>
            )}

        </section>
    )
}
