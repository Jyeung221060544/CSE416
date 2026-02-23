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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import USMap from '../components/maps/USMap'
import splashData from '../dummy/splash-states.json'  // TODO: replace with GET /api/states

export default function HomePage() {
    const [hoveredState, setHoveredState] = useState(null)

    return (
        <div className="flex flex-col h-full bg-brand-surface overflow-hidden">

            {/* ── Header ────────────────────────────────────────────── */}
            <div className="shrink-0 px-4 sm:px-8 lg:px-10 py-6 border-b border-brand-muted/30">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-muted mb-1">
                    Voting Rights Act · Redistricting Analysis
                </p>
                <h1 className="text-2xl sm:text-3xl font-bold text-brand-darkest tracking-tight">
                    Redistricting Explorer
                </h1>
                <p className="text-brand-muted/70 text-sm mt-1">
                    Analyze the Impact of the Voting Rights Act on Minorities
                </p>
            </div>

            {/* ── Map + Info card ───────────────────────────────────── */}
            <div className="flex flex-col lg:flex-row flex-1 gap-5 p-4 sm:p-6 lg:p-8 min-h-0">

                {/* Map panel */}
                <div className="rounded-xl overflow-hidden border border-brand-muted/25 shadow-sm h-[280px] sm:h-[360px] lg:h-auto lg:flex-[0_0_65%]">
                    <USMap onStateHover={setHoveredState} />
                </div>

                {/* Info card */}
                <div className="flex-1 min-w-0 flex flex-col min-h-[220px] lg:min-h-0">
                    <Card className="flex-1 p-0 border-brand-muted/25 shadow-sm overflow-hidden">

                        {hoveredState ? (
                            <>
                                <CardHeader className="pb-3 pt-6 px-6">
                                    <div className="flex items-center gap-2 mb-2">
                                        <MapPin className="w-4 h-4 text-brand-muted" />
                                        <span className="text-brand-muted text-xs uppercase tracking-[0.18em] font-semibold">
                                            State Profile
                                        </span>
                                    </div>
                                    <CardTitle className="text-brand-darkest text-2xl font-bold tracking-tight">
                                        {hoveredState.stateName}
                                    </CardTitle>
                                </CardHeader>

                                <Separator className="mx-6 bg-brand-muted/20" />

                                <CardContent className="pt-5 px-6 flex flex-col gap-5">
                                    <div className="flex items-center justify-between">
                                        <span className="text-brand-muted font-medium text-sm">Congressional Districts</span>
                                        <span className="text-brand-darkest font-bold text-xl tabular-nums">
                                            {hoveredState.numDistricts}
                                        </span>
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <span className="text-brand-muted font-medium text-sm">VRA Preclearance</span>
                                        {hoveredState.isPreclearance ? (
                                            <Badge className="bg-brand-primary/10 text-brand-primary border-brand-primary/30 text-xs font-semibold">
                                                Required
                                            </Badge>
                                        ) : (
                                            <Badge variant="outline" className="text-brand-muted border-brand-muted/40 text-xs">
                                                Not Required
                                            </Badge>
                                        )}
                                    </div>

                                    <Separator className="bg-brand-muted/20" />

                                    <div className="flex items-center justify-center gap-2 text-brand-muted/50">
                                        <MousePointerClick className="w-3.5 h-3.5" />
                                        <span className="text-xs">Click the state to open analysis</span>
                                    </div>
                                </CardContent>
                            </>
                        ) : (
                            <CardContent className="flex-1 flex flex-col items-center justify-center gap-5 text-center px-8 py-8">
                                <div className="w-14 h-14 rounded-full bg-brand-muted/10 flex items-center justify-center ring-1 ring-brand-muted/20">
                                    <BarChart2 className="w-6 h-6 text-brand-muted/40" />
                                </div>

                                <div>
                                    <p className="text-brand-darkest font-bold text-base">Select a State</p>
                                    <p className="font-semibold text-brand-muted/60 text-sm mt-1.5 leading-relaxed">
                                        Hover over a highlighted state on the map to analyze its profile.
                                    </p>
                                </div>

                                <Separator className="bg-brand-muted/20 w-12" />

                                <div className="flex flex-col items-center gap-2">
                                    <span className="font-semibold text-brand-muted text-[10px] uppercase tracking-widest">
                                        Available for Analysis
                                    </span>
                                    <div className="flex gap-2 flex-wrap justify-center">
                                        {splashData.states.map(s => (
                                            <Badge
                                                key={s.stateId}
                                                variant="outline"
                                                className="text-brand-deep border-brand-muted/40 bg-brand-muted/5 text-xs"
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
