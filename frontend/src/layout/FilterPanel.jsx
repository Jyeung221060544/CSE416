import { Separator } from '@/components/ui/separator'
import useAppStore from '../store/useAppStore'
import RaceFilter from '../components/filters/RaceFilter'
import FeasibleRaceFilter from '../components/filters/FeasibleRaceFilter'
import EIRaceFilter from '../components/filters/EIRaceFilter'
import GranularityFilter from '../components/filters/GranularityFilter'
import EnsembleFilter from '../components/filters/EnsembleFilter'
import ResetFiltersButton from '../components/filters/ResetFiltersButton'

export default function FilterPanel() {
    const activeSection = useAppStore((state) => state.activeSection)

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
            {activeSection === 'racial-polarization' && (
                <div className="flex flex-col gap-3">
                    <FeasibleRaceFilter />
                    <Separator className="bg-brand-deep" />
                    <EIRaceFilter />
                </div>
            )}

            {/* ── ENSEMBLE ANALYSIS ──────────────────────────── */}
            {activeSection === 'ensemble-analysis' && (
                <div className="flex flex-col gap-3">
                    <EnsembleFilter />
                    <Separator className="bg-brand-deep" />
                    <RaceFilter />
                </div>
            )}

            {/* ── Reset Button ───────────────────────────────── */}
            <Separator className="bg-brand-deep mt-1" />
            <ResetFiltersButton />

        </div>
    )
}
