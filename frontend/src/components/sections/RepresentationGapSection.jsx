/**
 * RepresentationGapSection.jsx — Fifth section on StatePage (id="representation-gap").
 *
 * Implements GUI-8 (compare two district plans on the map) and GUI-19 (display an
 * "interesting" district plan). Two plans are shown side-by-side at 50/50 width.
 *
 * PLANS
 *   current — The enacted congressional district plan (same GeoJSON as DistrictMap2024).
 *   high    — A SeaWulf-generated plan with high minority effectiveness (pending data).
 *   low     — A SeaWulf-generated plan with low minority effectiveness (pending data).
 *
 * FILTERS (sidebar)
 *   MapCompareFilter    — selects which 2 of the 3 plans to show (min 1, max 2).
 *   FeasibleRaceFilter  — selects the race whose effective districts are highlighted
 *                         (wiring placeholder — effective district data not yet available).
 *
 * LAYOUT
 *   If mapCompareFilter has 2 items → 50/50 grid of two RepresentationGapMap panels.
 *   If mapCompareFilter has 1 item  → single map + "select a second plan" message.
 *
 * PANEL TITLES (dynamic)
 *   When a plan key is assigned to a slot → its human-readable label is shown.
 *   When no plan is assigned (fallback)   → "Plan A" / "Plan B".
 */

import { useState, useCallback } from 'react'
import MapFrame          from '@/components/ui/map-frame'
import SectionHeader     from '@/components/ui/section-header'
import useAppStore       from '@/store/useAppStore'
import RepresentationGapMap from '@/components/maps/RepresentationGapMap'

/* ── District summary dummy fallback ─────────────────────────────────────────
 * Used when the backend does not yet serve districtSummary with racialGroup
 * fields for a state.  Replace by ensuring the backend endpoint returns the
 * full districtSummary (including racialGroup) for all states.
 * ─────────────────────────────────────────────────────────────────────────── */
import AL_DISTRICTS from '@/dummy/AL-district-summary.json'
import OR_DISTRICTS from '@/dummy/OR-district-summary.json'
const DISTRICT_DUMMY = { AL: AL_DISTRICTS, OR: OR_DISTRICTS }


/* ── Plan label + rationale lookup ──────────────────────────────────────── */
const PLAN_LABELS = {
    current: 'Current Enacted Plan',
    high:    'High Effectiveness Plan',
    low:     'Post-VRA Decision Scenario',
}

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
 * RepresentationGapSection — Side-by-side district plan comparison.
 *
 * @param {{ data: object|null, stateId: string }} props
 * @returns {JSX.Element}
 */
export default function RepresentationGapSection({ data, stateId }) {

    /* ── Zustand state ───────────────────────────────────────────────────── */
    const mapCompareFilter = useAppStore(s => s.mapCompareFilter)
    const effRaceFilter    = useAppStore(s => s.effRaceFilter)

    /* ── Derived ─────────────────────────────────────────────────────────── */
    const stateName      = data?.stateSummary?.stateName ?? null
    /* Fall back to dummy data when the backend does not return districtSummary
     * or when the districts are missing the racialGroup field. */
    const backendDistricts = data?.districtSummary
    const districtSummary = (backendDistricts?.districts?.[0]?.racialGroup != null)
        ? backendDistricts
        : (DISTRICT_DUMMY[stateId?.toUpperCase()] ?? backendDistricts ?? null)

    /* The two slots: plan key (or null if not enough selections) */
    const planA = mapCompareFilter[0] ?? null
    const planB = mapCompareFilter[1] ?? null

    const titleA = planA ? PLAN_LABELS[planA] : 'Plan A'
    const titleB = planB ? PLAN_LABELS[planB] : 'Plan B'

    const hasTwo = mapCompareFilter.length >= 2

    /* ── Effective district counts keyed by plan key ────────────────────── */
    const [countsByPlan, setCountsByPlan] = useState({})
    const onCountCurrent = useCallback(n => setCountsByPlan(p => ({ ...p, current: n })), [])
    const onCountHigh    = useCallback(n => setCountsByPlan(p => ({ ...p, high:    n })), [])
    const onCountLow     = useCallback(n => setCountsByPlan(p => ({ ...p, low:     n })), [])
    const getCountHandler = (planKey) =>
        planKey === 'current' ? onCountCurrent :
        planKey === 'high'    ? onCountHigh    :
        planKey === 'low'     ? onCountLow     : undefined

    /* ── Render ──────────────────────────────────────────────────────────── */
    return (
        <section
            id="representation-gap"
            className="p-2 sm:p-3 lg:p-4 border-b border-brand-muted/30 h-[calc(100vh-3.5rem)] flex flex-col overflow-hidden"
        >

            {/* ── SECTION TITLE ──────────────────────────────────────────── */}
            <div className="flex items-baseline justify-between mb-2 shrink-0">
                <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-brand-darkest tracking-tight">
                    {stateName && <span className="text-brand-primary">{stateName} — </span>}Representation Gap
                </h2>
                <span className="hidden sm:inline-flex items-center gap-1.5 text-sm italic font-medium text-brand-primary bg-brand-primary/10 border border-brand-primary/20 px-3 py-0.5 rounded-full">
                    &ldquo;How does minority representation compare across district plans?&rdquo;
                </span>
            </div>

            {/* ── EFFECTIVENESS LEGEND ───────────────────────────────────── */}
            <div className="flex items-center gap-4 mb-2 shrink-0">
                <div className="flex items-center gap-1.5">
                    <div className="w-4 h-4 rounded-sm" style={{ backgroundColor: 'rgba(134,239,172,0.28)', border: '2.5px solid rgba(254,240,138,0.45)' }} />
                    <span className="text-xs font-medium text-brand-darkest">Effective District</span>
                </div>
            </div>

            {/* ── MAP CONTENT ────────────────────────────────────────────── */}
            {hasTwo ? (

                /* ── SIDE-BY-SIDE (2 plans selected) ──────────────────────── */
                <div className="flex-1 min-h-0 grid grid-cols-1 xl:grid-cols-2 gap-6">

                    {/* ── LEFT PANEL ─────────────────────────────────────── */}
                    <div className="flex flex-col gap-1 min-h-0">
                        <SectionHeader title={titleA} />
                        <PlanStat plan={planA} countsByPlan={countsByPlan} />
                        <MapFrame className="flex-1 min-h-0">
                            <RepresentationGapMap
                                stateId={stateId}
                                plan={planA}
                                districtSummary={districtSummary}
                                feasibleRace={effRaceFilter}
                                onEffectiveCount={getCountHandler(planA)}
                            />
                        </MapFrame>
                    </div>

                    {/* ── RIGHT PANEL ────────────────────────────────────── */}
                    <div className="flex flex-col gap-1 min-h-0">
                        <SectionHeader title={titleB} />
                        <PlanStat plan={planB} countsByPlan={countsByPlan} />
                        <MapFrame className="flex-1 min-h-0">
                            <RepresentationGapMap
                                stateId={stateId}
                                plan={planB}
                                districtSummary={districtSummary}
                                feasibleRace={effRaceFilter}
                                onEffectiveCount={getCountHandler(planB)}
                            />
                        </MapFrame>
                    </div>

                </div>

            ) : (

                /* ── SINGLE PLAN + MESSAGE (< 2 plans selected) ───────────── */
                <div className="flex-1 min-h-0 grid grid-cols-1 xl:grid-cols-2 gap-6">

                    {/* ── SINGLE MAP ─────────────────────────────────────── */}
                    <div className="flex flex-col gap-1 min-h-0">
                        <SectionHeader title={titleA} />
                        <PlanStat plan={planA} countsByPlan={countsByPlan} />
                        <MapFrame className="flex-1 min-h-0">
                            {planA ? (
                                <RepresentationGapMap
                                    stateId={stateId}
                                    plan={planA}
                                    districtSummary={districtSummary}
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

                    {/* ── SELECT SECOND PLAN MESSAGE ─────────────────────── */}
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
