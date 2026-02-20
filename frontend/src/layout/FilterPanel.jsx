import { Separator } from '@/components/ui/separator'
import useAppStore from '../store/useAppStore'
import RaceFilter from '../components/filters/RaceFilter'
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
                <span className="text-xs px-1 text-slate-500 italic">No filters available</span>
            )}

            {/* ── DEMOGRAPHIC ────────────────────────────────── */}
            {activeSection === 'demographic' && (
                <div className="flex flex-col gap-3">
                    <RaceFilter />
                    <Separator className="bg-slate-700" />
                    <GranularityFilter />
                </div>
            )}

            {/* ── RACIAL POLARIZATION ────────────────────────── */}
            {activeSection === 'racial-polarization' && (
                <div className="flex flex-col gap-3">
                    <RaceFilter />
                    <Separator className="bg-slate-700" />
                    <EIRaceFilter />
                </div>
            )}

            {/* ── ENSEMBLE ANALYSIS ──────────────────────────── */}
            {activeSection === 'ensemble-analysis' && (
                <div className="flex flex-col gap-3">
                    <EnsembleFilter />
                    <Separator className="bg-slate-700" />
                    <RaceFilter />
                </div>
            )}

            {/* ── Reset Button ───────────────────────────────── */}
            <Separator className="bg-slate-700 mt-1" />
            <ResetFiltersButton />

        </div>
    )
}
