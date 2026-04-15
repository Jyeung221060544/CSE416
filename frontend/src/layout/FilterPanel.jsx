/**
 * FilterPanel.jsx — Context-sensitive filter controls shown in the Sidebar.
 *
 * WHICH FILTERS ARE SHOWN
 *   The rendered filter set changes based on the active section and, for
 *   Racial Polarization, the active mini-nav tab (read from Zustand).
 *
 *   state-overview                        → no filters (placeholder message)
 *   demographic                           → RaceFilter + district overlay toggle
 *   representation-gap                    → MapCompareFilter + FeasibleRaceFilter
 *   racial-polarization
 *     activeRPTab === 'gingles'           → FeasibleRaceFilter
 *     activeRPTab === 'ei-kde'            → EIRaceFilter
 *     activeRPTab === 'ei-bar'            → EIRaceFilter
 *     activeRPTab === 'vs-ss'            → no filters (placeholder message)
 *   ensemble-analysis
 *     activeEATab === 'ensemble-splits'   → no filters (placeholder message)
 *     activeEATab === 'box-whisker'       → FeasibleRaceFilter
 *   effectiveness-analysis
 *     activeEFFTab === 'effectiveness-visualizations' → EffRaceFilter + EffBWRaceFilter
 *     activeEFFTab === 'vra-impact'                   → EffRaceFilter (shared with histogram)
 *
 * STATE SOURCES
 *   activeSection — from Zustand; set by SectionPanel clicks and scroll.
 *   activeRPTab   — from Zustand; set by RP mini-nav pills and RP sidebar sub-nav.
 *   activeEATab   — from Zustand; set by EA mini-nav pills and EA sidebar sub-nav.
 *
 * PLACEMENT
 *   Rendered inside Sidebar's ScrollArea, below the SectionPanel.
 *   Hidden entirely when the sidebar is collapsed (Sidebar handles the guard).
 */

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


/**
 * FilterPanel — Renders the correct filters for the currently active section.
 *
 * @returns {JSX.Element}
 */
export default function FilterPanel() {

    /* ── Step 0: Read active section + tab state from Zustand ───────────── */
    const activeSection       = useAppStore((state) => state.activeSection)
    const activeRPTab         = useAppStore((state) => state.activeRPTab)
    const activeEATab         = useAppStore((state) => state.activeEATab)
    const activeEFFTab        = useAppStore((state) => state.activeEFFTab)
    const showDistrictOverlay    = useAppStore((state) => state.showDistrictOverlay)
    const setShowDistrictOverlay = useAppStore((state) => state.setShowDistrictOverlay)


    /* ── Step 1: Render ──────────────────────────────────────────────────── */
    return (
        <div className="flex flex-col gap-3">

            {/* ── STATE OVERVIEW ───────────────────────────────────────────── */}
            {/* No user-controllable filters exist for this section */}
            {activeSection === 'state-overview' && (
                <span className="text-xs px-1 text-white/90 italic">No filters available</span>
            )}

            {/* ── DEMOGRAPHIC ──────────────────────────────────────────────── */}
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

            {/* ── RACIAL POLARIZATION ──────────────────────────────────────── */}

            {/* Gingles tab: FeasibleRaceFilter picks the scatter plot's active race series */}
            {activeSection === 'racial-polarization' && activeRPTab === 'gingles' && (
                <FeasibleRaceFilter />
            )}

            {/* EI KDE tab: EIRaceFilter only */}
            {activeSection === 'racial-polarization' && activeRPTab === 'ei-kde' && (
                <EIRaceFilter />
            )}

            {/* EI Bar + Polarization tab: EIRaceFilter (for bar) + Select2RaceFilter (for KDE) */}
            {activeSection === 'racial-polarization' && activeRPTab === 'ei-bar' && (
                <div className="flex flex-col gap-3">
                    <EIRaceFilter />
                    <Separator className="bg-brand-deep" />
                    <Select2RaceFilter />
                </div>
            )}

            {/* Vote/Seat Share tab: no user-controllable filters */}
            {activeSection === 'racial-polarization' && activeRPTab === 'vs-ss' && (
                <span className="text-xs px-1 text-white/90 italic">No local filters available</span>
            )}

            {/* ── ENSEMBLE ANALYSIS ────────────────────────────────────────── */}

            {/* Ensemble Splits tab: compare toggle only */}
            {activeSection === 'ensemble-analysis' && activeEATab === 'ensemble-splits' && (
                <CompareFilter />
            )}

            {/* Box & Whisker tab: compare toggle + race selector */}
            {activeSection === 'ensemble-analysis' && activeEATab === 'box-whisker' && (
                <div className="flex flex-col gap-3">
                    <CompareFilter />
                    <Separator className="bg-brand-deep" />
                    <FeasibleRaceFilter />
                </div>
            )}

            {/* ── EFFECTIVENESS ANALYSIS ───────────────────────────────────── */}

            {/* Effectiveness Visualizations tab: EffRaceFilter (histogram) + EffBWRaceFilter (box & whisker) */}
            {activeSection === 'effectiveness-analysis' && activeEFFTab === 'effectiveness-visualizations' && (
                <div className="flex flex-col gap-3">
                    <EffRaceFilter />
                    <Separator className="bg-brand-deep" />
                    <EffBWRaceFilter />
                </div>
            )}

            {/* VRA Impact tab: EffRaceFilter only — shared with histogram */}
            {activeSection === 'effectiveness-analysis' && activeEFFTab === 'vra-impact' && (
                <EffRaceFilter />
            )}

            {/* ── REPRESENTATION GAP ───────────────────────────────────────── */}

            {/* MapCompareFilter: picks which 2 of the 3 plans to compare side-by-side */}
            {activeSection === 'representation-gap' && (
                <div className="flex flex-col gap-3">
                    <MapCompareFilter />
                    <Separator className="bg-brand-deep" />
                    <EffRaceFilter />
                </div>
            )}

            {/* ── RESET BUTTON ─────────────────────────────────────────────── */}
            {/* Always shown at the bottom; resets all filter slices to their defaults */}
            <Separator className="bg-brand-deep mt-1" />
            <ResetFiltersButton />

        </div>
    )
}
