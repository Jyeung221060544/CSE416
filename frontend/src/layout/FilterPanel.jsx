import { Separator } from '@/components/ui/separator'
import useAppStore from '../store/useAppStore'
import RaceFilter from '../components/filters/RaceFilter'
import FeasibleRaceFilter from '../components/filters/FeasibleRaceFilter'
import EIRaceFilter from '../components/filters/EIRaceFilter'
import GranularityFilter from '../components/filters/GranularityFilter'
import ResetFiltersButton from '../components/filters/ResetFiltersButton'

export default function FilterPanel() {
    const activeSection    = useAppStore((state) => state.activeSection)
    const activeSubSection = useAppStore((state) => state.activeSubSection)

    return (
        <div className="flex flex-col gap-3">

            {/* ── STATE OVERVIEW ─────────────────────────────── */}
            {activeSection === 'state-overview' && (
                <span className="text-xs px-1 text-brand-muted italic">No filters available</span>
            )}

            {/* ── DEMOGRAPHIC ────────────────────────────────── */}
            {activeSection === 'demographic' && (
                <div className="flex flex-col gap-3">
                    <GranularityFilter />
                    <Separator className="bg-brand-deep" />
                    <RaceFilter />
                </div>
            )}

            {/* ── RACIAL POLARIZATION ────────────────────────── */}
            {activeSection === 'racial-polarization' && activeSubSection === 'gingles-analysis' && (
                <FeasibleRaceFilter />
            )}
            {activeSection === 'racial-polarization' && activeSubSection === 'ecological-inference' && (
                <EIRaceFilter />
            )}

            {/* ── ENSEMBLE ANALYSIS ──────────────────────────── */}
            {activeSection === 'ensemble-analysis' && activeSubSection !== 'box-whisker' && (
                <span className="text-xs px-1 text-brand-muted italic">No filters available</span>
            )}
            {activeSection === 'ensemble-analysis' && activeSubSection === 'box-whisker' && (
                <FeasibleRaceFilter />
            )}

            {/* ── Reset Button ───────────────────────────────── */}
            <Separator className="bg-brand-deep mt-1" />
            <ResetFiltersButton />

        </div>
    )
}
