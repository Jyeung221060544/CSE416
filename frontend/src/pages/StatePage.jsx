
import Sidebar                   from '@/layout/Sidebar'
import StateOverviewSection      from '@/components/sections/StateOverviewSection'
import DemographicSection        from '@/components/sections/DemographicSection'
import RacialPolarizationSection from '@/components/sections/RacialPolarizationSection'
import EnsembleAnalysisSection   from '@/components/sections/EnsembleAnalysisSection'
import EffectivenessSection      from '@/components/sections/EffectivenessSection'
import RepresentationGapSection  from '@/components/sections/RepresentationGapSection'
import useStateData              from '@/hooks/useStateData'
import useAppStore               from '@/store/useAppStore'


/**
 * StatePage — Full-page state analysis view with sidebar navigation.
 *
 * @returns {JSX.Element}
 */
export default function StatePage() {
    const { stateId, data } = useStateData()
    const activeSection = useAppStore(s => s.activeSection)

    return (
        <div className="flex h-full overflow-hidden">

            {/* ── SIDEBAR ──────────────────────────────────────────────────── */}
            <Sidebar />

            {/* ── MAIN CONTENT AREA ────────────────────────────────────────── */}
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
                {activeSection === 'effectiveness-analysis' && (
                    <EffectivenessSection data={data} stateId={stateId} />
                )}
                {activeSection === 'representation-gap' && (
                    <RepresentationGapSection data={data} stateId={stateId} />
                )}

            </div>

        </div>
    )
}
