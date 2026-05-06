import { Separator } from '@/components/ui/separator'
import useAppStore from '../store/useAppStore'
import RaceFilter         from '../components/filters/RaceFilter'
import FeasibleRaceFilter from '../components/filters/FeasibleRaceFilter'
import EIRaceFilter       from '../components/filters/EIRaceFilter'
import CollapsibleGroup   from '../components/filters/CollapsibleGroup'
import MapCompareFilter   from '../components/filters/MapCompareFilter'
import CompareFilter       from '../components/filters/CompareFilter'
import Select2RaceFilter  from '../components/filters/Select2RaceFilter'
import EffRaceFilter      from '../components/filters/EffRaceFilter'
import EffBWRaceFilter    from '../components/filters/EffBWRaceFilter'
import ResetFiltersButton from '../components/filters/ResetFiltersButton'

export default function FilterPanel() {

    const activeSection       = useAppStore((state) => state.activeSection)
    const activeRPTab         = useAppStore((state) => state.activeRPTab)
    const activeEATab         = useAppStore((state) => state.activeEATab)
    const activeEFFTab        = useAppStore((state) => state.activeEFFTab)
    const showDistrictOverlay    = useAppStore((state) => state.showDistrictOverlay)
    const setShowDistrictOverlay = useAppStore((state) => state.setShowDistrictOverlay)

    return (
        <div className="flex flex-col gap-3">

            {activeSection === 'state-overview' && (
                <span className="text-xs px-1 text-white/90 italic">No filters available</span>
            )}

            {activeSection === 'demographic' && (
                <div className="flex flex-col gap-3">
                    <CollapsibleGroup label="Map Options">
                        <label className="flex items-center gap-2 px-1 py-1 cursor-pointer select-none">
                            <input
                                type="checkbox"
                                checked={showDistrictOverlay}
                                onChange={e => setShowDistrictOverlay(e.target.checked)}
                                className="appearance-none w-4 h-4 rounded border border-brand-primary checked:bg-brand-primary checked:border-brand-primary transition-colors shrink-0"
                            />
                            <span className="text-sm text-brand-surface">Show District Borders</span>
                        </label>
                    </CollapsibleGroup>
                    <Separator className="bg-brand-deep" />
                    <RaceFilter />
                </div>
            )}

            {activeSection === 'racial-polarization' && activeRPTab === 'gingles' && (
                <FeasibleRaceFilter />
            )}

            {activeSection === 'racial-polarization' && activeRPTab === 'ei-kde' && (
                <EIRaceFilter />
            )}

            {activeSection === 'racial-polarization' && activeRPTab === 'ei-bar' && (
                <div className="flex flex-col gap-3">
                    <EIRaceFilter />
                    <Separator className="bg-brand-deep" />
                    <Select2RaceFilter />
                </div>
            )}

            {activeSection === 'racial-polarization' && activeRPTab === 'vs-ss' && (
                <span className="text-xs px-1 text-white/90 italic">No local filters available</span>
            )}

            {activeSection === 'ensemble-analysis' && activeEATab === 'ensemble-splits' && (
                <CompareFilter />
            )}

            {activeSection === 'ensemble-analysis' && activeEATab === 'box-whisker' && (
                <div className="flex flex-col gap-3">
                    <CompareFilter />
                    <Separator className="bg-brand-deep" />
                    <FeasibleRaceFilter />
                </div>
            )}

            {activeSection === 'effectiveness-analysis' && activeEFFTab === 'effectiveness-visualizations' && (
                <div className="flex flex-col gap-3">
                    <EffRaceFilter />
                    <Separator className="bg-brand-deep" />
                    <EffBWRaceFilter />
                </div>
            )}

            {activeSection === 'effectiveness-analysis' && activeEFFTab === 'vra-impact' && (
                <EffRaceFilter />
            )}

            {activeSection === 'representation-gap' && (
                <div className="flex flex-col gap-3">
                    <MapCompareFilter />
                    <Separator className="bg-brand-deep" />
                    <EffRaceFilter />
                </div>
            )}

            <Separator className="bg-brand-deep mt-1" />
            <ResetFiltersButton />

        </div>
    )
}
