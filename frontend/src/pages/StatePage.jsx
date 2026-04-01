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
 *   │          │  ├────────────────────────────────────┤   │
 *   │          │  │  RepresentationGapSection           │   │
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

import Sidebar                   from '@/layout/Sidebar'
import StateOverviewSection      from '@/components/sections/StateOverviewSection'
import DemographicSection        from '@/components/sections/DemographicSection'
import RacialPolarizationSection from '@/components/sections/RacialPolarizationSection'
import EnsembleAnalysisSection   from '@/components/sections/EnsembleAnalysisSection'
import RepresentationGapSection  from '@/components/sections/RepresentationGapSection'
import useStateData              from '@/hooks/useStateData'
import useAppStore               from '@/store/useAppStore'


/**
 * StatePage — Full-page state analysis view with sidebar navigation.
 *
 * @returns {JSX.Element}
 */
export default function StatePage() {

    /* ── Step 1: Fetch state data + active section ───────────────────────── */
    const { stateId, data } = useStateData()
    const activeSection = useAppStore(s => s.activeSection)


    /* ── Step 2: Render ──────────────────────────────────────────────────── */
    return (
        <div className="flex h-full overflow-hidden">

            {/* ── SIDEBAR ──────────────────────────────────────────────────── */}
            <Sidebar />

            {/* ── MAIN CONTENT AREA ────────────────────────────────────────── */}
            {/* overflow-hidden: no scrolling — sections are tab-switched via sidebar */}
            <div className="flex-1 overflow-hidden bg-brand-surface">

                {activeSection === 'state-overview' && (
                    <StateOverviewSection data={data} stateId={stateId} />
                )}
                {activeSection === 'demographic' && (
                    <DemographicSection data={data} stateId={stateId} />
                )}
                {activeSection === 'racial-polarization' && (
                    <RacialPolarizationSection data={data} stateId={stateId} />
                )}
                {activeSection === 'ensemble-analysis' && (
                    <EnsembleAnalysisSection data={data} stateId={stateId} />
                )}
                {activeSection === 'representation-gap' && (
                    <RepresentationGapSection data={data} stateId={stateId} />
                )}

            </div>

        </div>
    )
}
