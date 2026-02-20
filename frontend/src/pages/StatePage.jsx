import Sidebar from '../layout/Sidebar'
import StateOverviewSection from '../components/sections/StateOverviewSection'
import DemographicSection from '../components/sections/DemographicSection'
import RacialPolarizationSection from '../components/sections/RacialPolarizationSection'
import EnsembleAnalysisSection from '../components/sections/EnsembleAnalysisSection'

export default function StatePage() {
    return (
      <div className="flex h-full overflow-hidden">
        {/* ── Sidebar ────────────────────────────────────── */}
        <Sidebar />

        {/* ── Main Content ───────────────────────────────── */}
        <div className="flex-1 overflow-y-auto bg-gray-50">
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