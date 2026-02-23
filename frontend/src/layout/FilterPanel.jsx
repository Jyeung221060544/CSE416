/**
 * FilterPanel.jsx — Context-sensitive filter controls shown in the Sidebar.
 *
 * WHICH FILTERS ARE SHOWN
 *   The rendered filter set changes based on the currently active section and
 *   sub-section (read from Zustand).  Each branch maps to:
 *
 *   state-overview           → no filters (placeholder message)
 *   demographic              → GranularityFilter + RaceFilter
 *   racial-polarization
 *     gingles-analysis       → FeasibleRaceFilter
 *     ecological-inference   → EIRaceFilter
 *   ensemble-analysis
 *     ensemble-splits        → no filters (placeholder message)
 *     box-whisker            → FeasibleRaceFilter
 *
 * STATE SOURCES
 *   activeSection    — from Zustand; updated by SectionPanel clicks and scroll.
 *   activeSubSection — from Zustand; updated when a sub-tab is selected.
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

    /* ── Step 0: Read active section from Zustand ────────────────────────── */
    const activeSection    = useAppStore((state) => state.activeSection)
    const activeSubSection = useAppStore((state) => state.activeSubSection)


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

            {/* Gingles sub-tab: FeasibleRaceFilter picks the scatter plot's active race series */}
            {activeSection === 'racial-polarization' && activeSubSection === 'gingles-analysis' && (
                <FeasibleRaceFilter />
            )}

            {/* EI sub-tab: EIRaceFilter is a multi-select for the KDE overlay lines */}
            {activeSection === 'racial-polarization' && activeSubSection === 'ecological-inference' && (
                <EIRaceFilter />
            )}

            {/* ── ENSEMBLE ANALYSIS ────────────────────────────────────────── */}

            {/* Ensemble Splits sub-tab: no additional filters */}
            {activeSection === 'ensemble-analysis' && activeSubSection !== 'box-whisker' && (
                <span className="text-xs px-1 text-white/90 italic">No filters available</span>
            )}

            {/* Box & Whisker sub-tab: FeasibleRaceFilter selects the racial group for the plot */}
            {activeSection === 'ensemble-analysis' && activeSubSection === 'box-whisker' && (
                <FeasibleRaceFilter />
            )}

            {/* ── RESET BUTTON ─────────────────────────────────────────────── */}
            {/* Always shown at the bottom; resets all filter slices to their defaults */}
            <Separator className="bg-brand-deep mt-1" />
            <ResetFiltersButton />

        </div>
    )
}
