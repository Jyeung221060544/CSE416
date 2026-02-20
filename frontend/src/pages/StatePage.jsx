import { useRef } from 'react'
import Sidebar from '../layout/Sidebar'
import StateOverviewSection from '../components/sections/StateOverviewSection'
import DemographicSection from '../components/sections/DemographicSection'
import RacialPolarizationSection from '../components/sections/RacialPolarizationSection'
import EnsembleAnalysisSection from '../components/sections/EnsembleAnalysisSection'
import useActiveSection from '../hooks/useActiveSection'
import useStateData from '../hooks/useStateData'

export default function StatePage() {
    const scrollRef = useRef(null)
    useActiveSection(scrollRef)
    const { stateId, data } = useStateData()

    return (
        <div className="flex h-full overflow-hidden">
            {/* ── Sidebar ────────────────────────────────────── */}
            <Sidebar />

            {/* ── Main Content ───────────────────────────────── */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto bg-brand-surface">
                <div className="flex flex-col gap-0">
                    <StateOverviewSection data={data} stateId={stateId} />
                    <DemographicSection   data={data} stateId={stateId} />
                    <RacialPolarizationSection data={data} stateId={stateId} />
                    <EnsembleAnalysisSection  data={data} stateId={stateId} />
                </div>
            </div>
        </div>
    )
}
