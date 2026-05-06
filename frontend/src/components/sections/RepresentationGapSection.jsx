import { useState, useCallback } from 'react'
import MapFrame          from '@/components/ui/map-frame'
import SectionHeader     from '@/components/ui/section-header'
import useAppStore       from '@/store/useAppStore'
import RepresentationGapMap from '@/components/maps/RepresentationGapMap'


const PLAN_LABELS = {
    current: 'Current Enacted Plan',
    high:    'High Effectiveness Plan',
    low:     'Post-VRA Decision Scenario',
}

/**
 * Displays the effective district count for a given plan, with an optional
 * delta vs. the enacted plan for the low-effectiveness scenario.
 * @param {string} plan - Plan key ('current' | 'high' | 'low').
 * @param {object} countsByPlan - Map of plan key → effective district count.
 */
function PlanStat({ plan, countsByPlan }) {
    if (plan === 'current') {
        const n = countsByPlan['current']
        if (n == null) return null
        return (
            <p className="text-center text-base font-semibold text-brand-darkest mb-0.5">
                <span className="text-2xl font-bold text-green-600">{n}</span> effective {n === 1 ? 'district' : 'districts'}
            </p>
        )
    }

    if (plan === 'low') {
        const lowCount     = countsByPlan['low']
        const currentCount = countsByPlan['current']
        if (lowCount == null) return null
        const delta = currentCount != null ? lowCount - currentCount : null
        const countColor = lowCount === 0 ? 'text-slate-400' : 'text-green-600'
        const deltaColor = 'text-slate-400'
        return (
            <p className="text-center text-base font-semibold text-brand-darkest mb-0.5">
                <span className={`text-2xl font-bold ${countColor}`}>{lowCount}</span> effective {lowCount === 1 ? 'district' : 'districts'}
                {delta != null && delta !== 0 && (
                    <span className={`ml-1.5 text-sm font-medium ${deltaColor}`}>
                        ({delta > 0 ? '+' : ''}{delta} vs. enacted)
                    </span>
                )}
            </p>
        )
    }

    return null
}

/**
 * Renders the Representation Gap section with a side-by-side or single-plan
 * map view showing district effectiveness under different redistricting scenarios.
 * @param {object} data - State overview data (used to derive district summary).
 * @param {string} stateId - State identifier passed to the map components.
 */
export default function RepresentationGapSection({ data, stateId }) {

    const mapCompareFilter = useAppStore(s => s.mapCompareFilter)
    const effRaceFilter    = useAppStore(s => s.effRaceFilter)

    const planA = mapCompareFilter[0] ?? null
    const planB = mapCompareFilter[1] ?? null

    const titleA = planA ? PLAN_LABELS[planA] : 'Plan A'
    const titleB = planB ? PLAN_LABELS[planB] : 'Plan B'

    const hasTwo = mapCompareFilter.length >= 2

    // Step 0: Track effective district counts per plan for PlanStat display
    const [countsByPlan, setCountsByPlan] = useState({})
    const onCountCurrent = useCallback(n => setCountsByPlan(p => ({ ...p, current: n })), [])
    const onCountHigh    = useCallback(n => setCountsByPlan(p => ({ ...p, high:    n })), [])
    const onCountLow     = useCallback(n => setCountsByPlan(p => ({ ...p, low:     n })), [])
    const getCountHandler = (planKey) =>
        planKey === 'current' ? onCountCurrent :
        planKey === 'high'    ? onCountHigh    :
        planKey === 'low'     ? onCountLow     : undefined

    // Step 1: Render side-by-side maps if two plans selected, otherwise single map + prompt
    return (
        <section
            id="representation-gap"
            className="p-2 sm:p-3 lg:p-4 border-b border-brand-muted/30 h-[calc(100vh-3.5rem)] flex flex-col overflow-hidden"
        >

            <div className="flex items-baseline justify-between mb-2 shrink-0">
                <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-brand-darkest tracking-tight">
                    Representation Gap
                </h2>
                <span className="hidden sm:inline-flex items-center gap-1.5 text-sm italic font-medium text-brand-primary bg-brand-primary/10 border border-brand-primary/20 px-3 py-0.5 rounded-full">
                    &ldquo;What does the district plan look like in a world without the VRA?&rdquo;
                </span>
            </div>

            <div className="flex items-center gap-4 mb-2 shrink-0">
                <div className="flex items-center gap-1.5">
                    <div className="w-4 h-4 rounded-sm" style={{ backgroundColor: 'rgba(134,239,172,0.28)', border: '2.5px solid rgba(254,240,138,0.45)' }} />
                    <span className="text-xs font-medium text-brand-darkest">Effective District</span>
                </div>
            </div>

            {hasTwo ? (

                <div className="flex-1 min-h-0 grid grid-cols-1 xl:grid-cols-2 gap-6">

                    <div className="flex flex-col gap-1 min-h-0">
                        <SectionHeader title={titleA} />
                        <PlanStat plan={planA} countsByPlan={countsByPlan} />
                        <MapFrame className="flex-1 min-h-0">
                            {/* Representation Gap Map — Plan A */}
                            <RepresentationGapMap
                                stateId={stateId}
                                plan={planA}
                                feasibleRace={effRaceFilter}
                                onEffectiveCount={getCountHandler(planA)}
                            />
                        </MapFrame>
                    </div>

                    <div className="flex flex-col gap-1 min-h-0">
                        <SectionHeader title={titleB} />
                        <PlanStat plan={planB} countsByPlan={countsByPlan} />
                        <MapFrame className="flex-1 min-h-0">
                            {/* Representation Gap Map — Plan B */}
                            <RepresentationGapMap
                                stateId={stateId}
                                plan={planB}
                                feasibleRace={effRaceFilter}
                                onEffectiveCount={getCountHandler(planB)}
                            />
                        </MapFrame>
                    </div>

                </div>

            ) : (

                <div className="flex-1 min-h-0 grid grid-cols-1 xl:grid-cols-2 gap-6">

                    <div className="flex flex-col gap-1 min-h-0">
                        <SectionHeader title={titleA} />
                        <PlanStat plan={planA} countsByPlan={countsByPlan} />
                        <MapFrame className="flex-1 min-h-0">
                            {planA ? (
                                /* Representation Gap Map — Single Plan */
                                <RepresentationGapMap
                                    stateId={stateId}
                                    plan={planA}
                                    feasibleRace={effRaceFilter}
                                    onEffectiveCount={getCountHandler(planA)}
                                />
                            ) : (
                                <div className="h-full flex items-center justify-center text-brand-muted/50 text-sm italic">
                                    No plan selected
                                </div>
                            )}
                        </MapFrame>
                    </div>

                    <div className="flex flex-col gap-1 min-h-0">
                        <SectionHeader title={titleB} />
                        <MapFrame className="flex-1 min-h-0">
                            <div className="h-full flex flex-col items-center justify-center gap-3 text-center px-6">
                                <p className="text-brand-muted/60 text-sm font-medium">
                                    Select a second plan to compare
                                </p>
                                <p className="text-brand-muted/40 text-xs">
                                    Use the <span className="font-semibold">Compare Plans</span> filter in the sidebar to choose a second district plan.
                                </p>
                            </div>
                        </MapFrame>
                    </div>

                </div>

            )}

        </section>
    )
}
