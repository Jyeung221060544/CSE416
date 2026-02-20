import { useRef } from 'react'
import Sidebar from '../layout/Sidebar'
import StateOverviewSection from '../components/sections/StateOverviewSection'
import DemographicSection from '../components/sections/DemographicSection'
import RacialPolarizationSection from '../components/sections/RacialPolarizationSection'
import EnsembleAnalysisSection from '../components/sections/EnsembleAnalysisSection'
import useActiveSection from '../hooks/useActiveSection'

export default function StatePage() {
    const scrollRef = useRef(null)
    useActiveSection(scrollRef)

    return (
        <div className="flex h-full overflow-hidden">
            {/* ── Sidebar ────────────────────────────────────── */}
            <Sidebar />

            {/* ── Main Content ───────────────────────────────── */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto bg-brand-surface">
                <div className="flex flex-col gap-0">
                    <StateOverviewSection />
                    <DemographicSection />
                    <RacialPolarizationSection />
                    <EnsembleAnalysisSection />
                </div>
            </div>
        </div>
    )
}
