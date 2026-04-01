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

import MapFrame          from '@/components/ui/map-frame'
import SectionHeader     from '@/components/ui/section-header'
import useAppStore       from '@/store/useAppStore'
import RepresentationGapMap from '@/components/maps/RepresentationGapMap'


/* ── Plan label lookup ───────────────────────────────────────────────────── */
const PLAN_LABELS = {
    current: 'Current Plan',
    high:    'High Effectiveness Plan',
    low:     'Low Effectiveness Plan',
}


/**
 * RepresentationGapSection — Side-by-side district plan comparison.
 *
 * @param {{ data: object|null, stateId: string }} props
 * @returns {JSX.Element}
 */
export default function RepresentationGapSection({ data, stateId }) {

    /* ── Zustand state ───────────────────────────────────────────────────── */
    const mapCompareFilter  = useAppStore(s => s.mapCompareFilter)
    const feasibleRaceFilter = useAppStore(s => s.feasibleRaceFilter)

    /* ── Derived ─────────────────────────────────────────────────────────── */
    const stateName      = data?.stateSummary?.stateName ?? null
    const districtSummary = data?.districtSummary ?? null

    /* The two slots: plan key (or null if not enough selections) */
    const planA = mapCompareFilter[0] ?? null
    const planB = mapCompareFilter[1] ?? null

    const titleA = planA ? PLAN_LABELS[planA] : 'Plan A'
    const titleB = planB ? PLAN_LABELS[planB] : 'Plan B'

    const hasTwo = mapCompareFilter.length >= 2

    /* ── Render ──────────────────────────────────────────────────────────── */
    return (
        <section
            id="representation-gap"
            className="p-2 sm:p-3 lg:p-4 border-b border-brand-muted/30 h-[calc(100vh-3.5rem)] flex flex-col overflow-hidden"
        >

            {/* ── SECTION TITLE ──────────────────────────────────────────── */}
            <div className="flex items-baseline justify-between mb-6 shrink-0">
                <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-brand-darkest tracking-tight">
                    {stateName && <span className="text-brand-primary">{stateName} — </span>}Representation Gap
                </h2>
                <span className="hidden sm:inline-flex items-center gap-1.5 text-sm italic font-medium text-brand-primary bg-brand-primary/10 border border-brand-primary/20 px-3 py-0.5 rounded-full">
                    &ldquo;How does minority representation compare across district plans?&rdquo;
                </span>
            </div>

            {/* ── MAP CONTENT ────────────────────────────────────────────── */}
            {hasTwo ? (

                /* ── SIDE-BY-SIDE (2 plans selected) ──────────────────────── */
                <div className="flex-1 min-h-0 grid grid-cols-1 xl:grid-cols-2 gap-6">

                    {/* ── LEFT PANEL ─────────────────────────────────────── */}
                    <div className="flex flex-col gap-1 min-h-0">
                        <SectionHeader title={titleA} />
                        <MapFrame className="flex-1 min-h-0">
                            <RepresentationGapMap
                                stateId={stateId}
                                plan={planA}
                                districtSummary={districtSummary}
                                feasibleRace={feasibleRaceFilter}
                            />
                        </MapFrame>
                    </div>

                    {/* ── RIGHT PANEL ────────────────────────────────────── */}
                    <div className="flex flex-col gap-1 min-h-0">
                        <SectionHeader title={titleB} />
                        <MapFrame className="flex-1 min-h-0">
                            <RepresentationGapMap
                                stateId={stateId}
                                plan={planB}
                                districtSummary={districtSummary}
                                feasibleRace={feasibleRaceFilter}
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
                        <MapFrame className="flex-1 min-h-0">
                            {planA ? (
                                <RepresentationGapMap
                                    stateId={stateId}
                                    plan={planA}
                                    districtSummary={districtSummary}
                                    feasibleRace={feasibleRaceFilter}
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
