/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║  TODO – Replace splash-states.json with a real API call             ║
 * ║                                                                      ║
 * ║  Currently: `splashData` (splash-states.json) drives the right-hand ║
 * ║  info card — it supplies stateName, numDistricts, isPreclearance.   ║
 * ║                                                                      ║
 * ║  Replace with:  GET /api/states                                     ║
 * ║    → fetch on mount with useState/useEffect                         ║
 * ║    → pass the resulting array to USMap (for which states light up)  ║
 * ║    → use the hovered state object from the same array for the card  ║
 * ║                                                                      ║
 * ║  The card already displays whatever is in `hoveredState`, so no     ║
 * ║  other changes are needed here once the data source is swapped.     ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 */

import { useState } from 'react'
import { MapPin, BarChart2, MousePointerClick } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Card, CardContent, CardHeader, CardTitle,} from '@/components/ui/card'
import USMap from '../components/maps/USMap'
import splashData from '../dummy/splash-states.json'  // TODO: replace with GET /api/states

export default function HomePage() {
    const [hoveredState, setHoveredState] = useState(null)

    return (
        <div className="flex flex-col h-full bg-brand-darkest overflow-hidden">
            {/* ── Tagline ────────────────────────────────────────────── */}
            <div className="shrink-0 flex items-center justify-between px-4 sm:px-10 py-4 sm:py-5 border-b border-brand-deep/40 gap-4">
                <div className="min-w-0">
                    <p className="text-brand-muted text-[10px] font-bold uppercase tracking-[0.2em] mb-1">
                        Voting Rights Act · Redistricting Analysis
                    </p>
                    <h1 className="text-brand-surface text-xl sm:text-3xl font-bold tracking-tight leading-tight">
                        Redistricting Explorer
                    </h1>
                    <p className="text-brand-muted/70 text-xs sm:text-sm mt-1">
                        Congressional district plans, ensemble analysis, and racial polarization data.
                    </p>
                </div>

                {/* Available-states chips */}
                <div className="hidden sm:flex flex-col items-end gap-2 shrink-0">
                    <span className="text-brand-muted/50 text-[10px] uppercase tracking-widest">
                        Available States
                    </span>
                    <div className="flex gap-2">
                        {splashData.states.map(s => (
                            <Badge
                                key={s.stateId}
                                variant="outline"
                                className="text-brand-muted border-brand-deep/60 bg-brand-deep/20 text-xs"
                            >
                                {s.stateName}
                            </Badge>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── Map + Card ─────────────────────────────────────────── */}
            <div className="flex flex-col lg:flex-row flex-1 gap-4 sm:gap-5 p-4 sm:p-6 min-h-0">

                {/* Map panel — full width on small, 65% on lg */}
                <div className="rounded-xl overflow-hidden ring-1 ring-brand-deep/50 shadow-2xl h-[280px] sm:h-[360px] lg:h-auto lg:flex-[0_0_65%]">
                    <USMap onStateHover={setHoveredState} />
                </div>

                {/* Info card — full width on small, 35% on lg */}
                <div className="flex-1 min-w-0 flex flex-col min-h-[220px] lg:min-h-0">
                    <Card className="flex-1 p-0 bg-white/5 backdrop-blur-sm border-brand-deep/40 text-brand-surface shadow-xl overflow-hidden">

                        {hoveredState ? (
                            /* ── Hovered state ── */
                            <>
                                <CardHeader className="pb-3 pt-6 px-6">
                                    <div className="flex items-center gap-2 mb-2">
                                        <MapPin className="w-3.5 h-3.5 text-brand-muted" />
                                        <span className="text-brand-muted text-[10px] uppercase tracking-[0.18em] font-semibold">
                                            State Profile
                                        </span>
                                    </div>
                                    <CardTitle className="text-brand-surface text-2xl font-bold tracking-tight">
                                        {hoveredState.stateName}
                                    </CardTitle>
                                </CardHeader>

                                <Separator className="bg-brand-deep/40 mx-6" />

                                <CardContent className="pt-5 px-6 flex flex-col gap-4">
                                    {/* Districts */}
                                    <div className="flex items-center justify-between">
                                        <span className="text-brand-muted/80 text-sm">
                                            Congressional Districts
                                        </span>
                                        <span className="text-brand-surface font-semibold text-xl tabular-nums">
                                            {hoveredState.numDistricts}
                                        </span>
                                    </div>

                                    {/* VRA Preclearance */}
                                    <div className="flex items-center justify-between">
                                        <span className="text-brand-muted/80 text-sm">
                                            VRA Preclearance
                                        </span>
                                        {hoveredState.isPreclearance ? (
                                            <Badge className="bg-brand-primary/90 text-white border-0 text-xs px-2.5">
                                                Required
                                            </Badge>
                                        ) : (
                                            <Badge
                                                variant="outline"
                                                className="text-brand-muted border-brand-deep/60 text-xs px-2.5"
                                            >
                                                Not Required
                                            </Badge>
                                        )}
                                    </div>

                                    <Separator className="bg-brand-deep/30" />

                                    {/* Click hint */}
                                    <div className="flex items-center justify-center gap-2 text-brand-muted/50">
                                        <MousePointerClick className="w-3.5 h-3.5" />
                                        <span className="text-xs">Click the state to open analysis</span>
                                    </div>
                                </CardContent>
                            </>
                        ) : (
                            /* ── Default / nothing hovered ── */
                            <CardContent className="flex-1 flex flex-col items-center justify-center gap-5 text-center px-8 py-8">
                                <div className="w-14 h-14 rounded-full bg-brand-deep/20 flex items-center justify-center ring-1 ring-brand-deep/40">
                                    <BarChart2 className="w-6 h-6 text-brand-muted/60" />
                                </div>

                                <div>
                                    <p className="text-brand-surface font-semibold text-base tracking-tight">
                                        Select a State
                                    </p>
                                    <p className="text-brand-muted/60 text-sm mt-1.5 leading-relaxed">
                                        Hover over a highlighted state on the map to preview its profile.
                                    </p>
                                </div>

                                <Separator className="bg-brand-deep/30 w-12" />

                                <div className="flex flex-col items-center gap-2">
                                    <span className="text-brand-muted/40 text-[10px] uppercase tracking-widest">
                                        Available for Analysis
                                    </span>
                                    <div className="flex gap-2 flex-wrap justify-center">
                                        {splashData.states.map(s => (
                                            <Badge
                                                key={s.stateId}
                                                variant="outline"
                                                className="text-brand-muted border-brand-deep/50 bg-brand-deep/10 text-xs"
                                            >
                                                {s.stateName}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            </CardContent>
                        )}
                    </Card>
                </div>

            </div>
        </div>
    )
}
