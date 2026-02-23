/**
 * StatePage.jsx — Per-state analysis page at route '/state/:stateId'.
 *
 * LAYOUT
 *   ┌──────────┬────────────────────────────────────────────┐
 *   │  Sidebar │  Scrollable main content area              │
 *   │  (fixed) │  ┌────────────────────────────────────┐   │
 *   │          │  │  StateOverviewSection               │   │
 *   │          │  ├────────────────────────────────────┤   │
 *   │          │  │  DemographicSection                 │   │
 *   │          │  ├────────────────────────────────────┤   │
 *   │          │  │  RacialPolarizationSection          │   │
 *   │          │  ├────────────────────────────────────┤   │
 *   │          │  │  EnsembleAnalysisSection            │   │
 *   │          │  └────────────────────────────────────┘   │
 *   └──────────┴────────────────────────────────────────────┘
 *
 * DATA FLOW
 *   useStateData()     — reads :stateId from the URL param; returns { stateId, data }.
 *                        data is the full bundle with stateSummary, districtSummary,
 *                        splits, boxWhisker, ginglesPrecinct, ei, heatmapPrecinct, etc.
 *   useActiveSection() — attaches an IntersectionObserver to scrollRef so the sidebar
 *                        highlight tracks the section currently in view.
 *
 * SCROLLING
 *   The inner <div ref={scrollRef}> is the scroll container (overflow-y-auto).
 *   useActiveSection observes its children via the ref.
 *   SectionPanel's scrollToSection() / scrollToSubSection() also target this container.
 */

import { useRef } from 'react'
import Sidebar                  from '../layout/Sidebar'
import StateOverviewSection     from '../components/sections/StateOverviewSection'
import DemographicSection       from '../components/sections/DemographicSection'
import RacialPolarizationSection from '../components/sections/RacialPolarizationSection'
import EnsembleAnalysisSection  from '../components/sections/EnsembleAnalysisSection'
import useActiveSection         from '../hooks/useActiveSection'
import useStateData             from '../hooks/useStateData'


/**
 * StatePage — Full-page state analysis view with sidebar navigation.
 *
 * @returns {JSX.Element}
 */
export default function StatePage() {

    /* ── Step 0: Scroll container ref ────────────────────────────────────── */
    /* scrollRef is attached to the inner scrollable div.
     * useActiveSection uses it as the root for IntersectionObserver entries. */
    const scrollRef = useRef(null)


    /* ── Step 1: Activate scroll-tracking + fetch state data ─────────────── */
    /* useActiveSection — observes section elements and updates Zustand on scroll.
     * useStateData     — resolves :stateId from the URL, syncs to Zustand navbar badge,
     *                    and returns the full data bundle for this state. */
    useActiveSection(scrollRef)
    const { stateId, data } = useStateData()


    /* ── Step 2: Render ──────────────────────────────────────────────────── */
    return (
        <div className="flex h-full overflow-hidden">

            {/* ── SIDEBAR ──────────────────────────────────────────────────── */}
            {/* Collapsible left panel with section nav and context-sensitive filters */}
            <Sidebar />

            {/* ── MAIN SCROLL AREA ─────────────────────────────────────────── */}
            {/* overflow-y-auto here — NOT on the outer container — so only this
                div scrolls while Sidebar and Navbar remain fixed. */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto bg-brand-surface">
                <div className="flex flex-col gap-0">

                    {/* ── STATE OVERVIEW ───────────────────────────────────── */}
                    {/* Summary cards: population, districts, party control, demographics */}
                    <StateOverviewSection data={data} stateId={stateId} />

                    {/* ── DEMOGRAPHIC DATA ─────────────────────────────────── */}
                    {/* Heatmap + district table; filtered by granularity + race */}
                    <DemographicSection data={data} stateId={stateId} />

                    {/* ── RACIAL POLARIZATION ──────────────────────────────── */}
                    {/* Sub-sections: Gingles Analysis + Ecological Inference */}
                    <RacialPolarizationSection data={data} stateId={stateId} />

                    {/* ── ENSEMBLE ANALYSIS ────────────────────────────────── */}
                    {/* Sub-sections: Ensemble Splits + Box & Whisker */}
                    <EnsembleAnalysisSection data={data} stateId={stateId} />

                </div>
            </div>

        </div>
    )
}
