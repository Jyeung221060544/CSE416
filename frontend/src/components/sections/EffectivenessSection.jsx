/**
 * EffectivenessSection.jsx — Effectiveness Analysis section (id="effectiveness-analysis").
 *
 * TABS
 *   effectiveness-visualizations — 50/50 split: histogram (left) + box & whisker (right)
 *   vra-impact                   — 100% width VRA impact threshold table
 *
 * DATA
 *   Loaded from dummy JSON until the backend endpoint is implemented.
 *   TODO: Replace with fetchEnsembleEffectiveness(stateId) once
 *         GET /api/states/:stateId/ensemble/effectiveness is ready.
 */

import { useEffect, useRef, useState }  from 'react'
import BrowserTabs              from '@/components/ui/browser-tabs'
import SectionHeader            from '@/components/ui/section-header'
import EffectivenessHistogram   from '@/components/charts/EffectivenessHistogram'
import EffectivenessBoxWhisker  from '@/components/charts/EffectivenessBoxWhisker'
import VRAImpactTable           from '@/components/tables/VRAImpactTable'
import useAppStore              from '@/store/useAppStore'
import { RACE_LABELS }          from '@/lib/partyColors'

// TODO: import { fetchEnsembleEffectiveness } from '../../api'  ← wire in once backend endpoint is implemented
import AL_EFFECTIVENESS from '@/dummy/AL-effectiveness.json'
import OR_EFFECTIVENESS from '@/dummy/OR-effectiveness.json'
const EFFECTIVENESS_DUMMY = { AL: AL_EFFECTIVENESS, OR: OR_EFFECTIVENESS }


/* ── Tab definitions ─────────────────────────────────────────────────────── */

const EFF_TABS = [
    { id: 'effectiveness-visualizations', label: 'Effectiveness Visualizations' },
    { id: 'vra-impact',                   label: 'VRA Impact'                   },
]


/**
 * EffectivenessSection — Effectiveness analysis with visualizations + VRA table.
 *
 * @param {{ data: object|null, stateId: string }} props
 * @returns {JSX.Element}
 */
export default function EffectivenessSection({ data, stateId }) {

    /* ── Zustand state ───────────────────────────────────────────────────── */
    const activeTab          = useAppStore(s => s.activeEFFTab)
    const setActiveTab       = useAppStore(s => s.setActiveEFFTab)
    const feasibleRaceFilter = useAppStore(s => s.feasibleRaceFilter)
    const activeSection      = useAppStore(s => s.activeSection)

    const inEFF = activeSection === 'effectiveness-analysis'

    /* ── Lazy fetch: load dummy data on first entry ──────────────────────── */
    const [effectivenessData, setEffectivenessData] = useState(null)
    const hasFetched = useRef(false)

    /* Reset on state change */
    useEffect(() => {
        setEffectivenessData(null)
        hasFetched.current = false
    }, [stateId])

    useEffect(() => {
        if (!stateId || !inEFF) return
        if (hasFetched.current) return
        hasFetched.current = true
        // TODO: Replace with API call once backend endpoint is implemented:
        //   fetchEnsembleEffectiveness(stateId).then(setEffectivenessData).catch(...)
        const dummy = EFFECTIVENESS_DUMMY[stateId?.toUpperCase()] ?? null
        setEffectivenessData(dummy)
    }, [stateId, inEFF])

    /* ── Derived ─────────────────────────────────────────────────────────── */
    const stateName = data?.stateSummary?.stateName ?? null
    const raceName  = RACE_LABELS[feasibleRaceFilter] ?? feasibleRaceFilter

    /* ── Empty state ─────────────────────────────────────────────────────── */
    const emptyState = (
        <div className="rounded-xl border border-dashed border-brand-muted/30 bg-white/40 p-10 flex items-center justify-center min-h-[240px]">
            <p className="text-brand-muted/50 text-sm italic">
                Effectiveness analysis not available for this state.
            </p>
        </div>
    )

    /* ── Render ──────────────────────────────────────────────────────────── */
    return (
        <section
            id="effectiveness-analysis"
            className="p-2 sm:p-3 lg:p-4 border-b border-brand-muted/30 h-[calc(100vh-3.5rem)] flex flex-col overflow-hidden"
        >

            {/* ── SECTION TITLE ──────────────────────────────────────────── */}
            <div className="flex items-baseline justify-between mb-2 shrink-0">
                <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-brand-darkest tracking-tight">
                    {stateName && <span className="text-brand-primary">{stateName} — </span>}Effectiveness Analysis
                </h2>
                <span className="hidden sm:inline-flex items-center gap-1.5 text-sm italic font-medium text-brand-primary bg-brand-primary/10 border border-brand-primary/20 px-3 py-0.5 rounded-full">
                    &ldquo;How often do ensemble plans meet minority effectiveness thresholds?&rdquo;
                </span>
            </div>

            <BrowserTabs
                tabs={EFF_TABS}
                activeTab={activeTab}
                onChange={setActiveTab}
                className="flex flex-col flex-1 min-h-0"
                panelClassName="flex-1 min-h-0 overflow-hidden p-5"
            >

                {/* ── EFFECTIVENESS VISUALIZATIONS ───────────────────────── */}
                {activeTab === 'effectiveness-visualizations' && (
                    effectivenessData ? (
                        <div className="grid grid-cols-2 gap-6 h-full">

                            {/* ── LEFT: Histogram ────────────────────────── */}
                            <div className="flex flex-col gap-1 min-w-0 h-full">
                                <SectionHeader title="Effectiveness Histogram" className="shrink-0" />
                                <EffectivenessHistogram
                                    data={effectivenessData.effectivenessHistogram}
                                    raceKey={feasibleRaceFilter}
                                    raceName={raceName}
                                    className="flex-1 min-h-0"
                                />
                            </div>

                            {/* ── RIGHT: Box & Whisker ───────────────────── */}
                            <div className="flex flex-col gap-1 min-w-0 h-full">
                                <SectionHeader title="Effectiveness Box & Whisker" className="shrink-0" />
                                <EffectivenessBoxWhisker
                                    data={effectivenessData.effectivenessBoxWhisker}
                                    feasibleGroups={effectivenessData.feasibleGroups}
                                    className="flex-1 min-h-0"
                                />
                            </div>

                        </div>
                    ) : emptyState
                )}

                {/* ── VRA IMPACT ─────────────────────────────────────────── */}
                {activeTab === 'vra-impact' && (
                    effectivenessData ? (
                        <div className="h-full flex">
                            <div className="w-[70%] h-full">
                                <VRAImpactTable data={effectivenessData.vraImpactThreshold} />
                            </div>
                        </div>
                    ) : emptyState
                )}

            </BrowserTabs>

        </section>
    )
}
