/**
 * FilterPanel.jsx — Context-sensitive filter controls shown in the Sidebar.
 *
 * WHICH FILTERS ARE SHOWN
 *   The rendered filter set changes based on the active section and, for
 *   Racial Polarization, the active mini-nav tab (read from Zustand).
 *
 *   state-overview                        → no filters (placeholder message)
 *   demographic                           → GranularityFilter + RaceFilter
 *   racial-polarization
 *     activeRPTab === 'gingles'           → FeasibleRaceFilter
 *     activeRPTab === 'ei-kde'            → EIRaceFilter
 *     activeRPTab === 'ei-bar'            → EIRaceFilter
 *   ensemble-analysis
 *     activeEATab === 'ensemble-splits'   → no filters (placeholder message)
 *     activeEATab === 'box-whisker'       → FeasibleRaceFilter
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
import GranularityFilter  from '../components/filters/GranularityFilter'
import ResetFiltersButton from '../components/filters/ResetFiltersButton'


/**
 * FilterPanel — Renders the correct filters for the currently active section.
 *
 * @returns {JSX.Element}
 */
export default function FilterPanel() {

    /* ── Step 0: Read active section + tab state from Zustand ───────────── */
    const activeSection = useAppStore((state) => state.activeSection)
    const activeRPTab   = useAppStore((state) => state.activeRPTab)
    const activeEATab   = useAppStore((state) => state.activeEATab)


    /* ── Step 1: Render ──────────────────────────────────────────────────── */
    return (
        <div className="flex flex-col gap-3">

            {/* ── STATE OVERVIEW ───────────────────────────────────────────── */}
            {/* No user-controllable filters exist for this section */}
            {activeSection === 'state-overview' && (
                <span className="text-xs px-1 text-white/90 italic">No filters available</span>
            )}

            {/* ── DEMOGRAPHIC ──────────────────────────────────────────────── */}
            {/* GranularityFilter: toggle between precinct-level and census-block-level data.
                RaceFilter: select which racial group's heatmap layer is shown. */}
            {activeSection === 'demographic' && (
                <div className="flex flex-col gap-3">
                    <GranularityFilter />
                    <Separator className="bg-brand-deep" />
                    <RaceFilter />
                </div>
            )}

            {/* ── RACIAL POLARIZATION ──────────────────────────────────────── */}

            {/* Gingles tab: FeasibleRaceFilter picks the scatter plot's active race series */}
            {activeSection === 'racial-polarization' && activeRPTab === 'gingles' && (
                <FeasibleRaceFilter />
            )}

            {/* EI KDE / EI Bar tabs: EIRaceFilter is a multi-select for the overlay lines */}
            {activeSection === 'racial-polarization' && (activeRPTab === 'ei-kde' || activeRPTab === 'ei-bar') && (
                <EIRaceFilter />
            )}

            {/* ── ENSEMBLE ANALYSIS ────────────────────────────────────────── */}

            {/* Ensemble Splits tab: no user-controllable filters */}
            {activeSection === 'ensemble-analysis' && activeEATab === 'ensemble-splits' && (
                <span className="text-xs px-1 text-white/90 italic">No filters available</span>
            )}

            {/* Box & Whisker tab: FeasibleRaceFilter picks which minority group to plot */}
            {activeSection === 'ensemble-analysis' && activeEATab === 'box-whisker' && (
                <FeasibleRaceFilter />
            )}

            {/* ── RESET BUTTON ─────────────────────────────────────────────── */}
            {/* Always shown at the bottom; resets all filter slices to their defaults */}
            <Separator className="bg-brand-deep mt-1" />
            <ResetFiltersButton />

        </div>
    )
}
