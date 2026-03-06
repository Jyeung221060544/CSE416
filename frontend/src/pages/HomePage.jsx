/**
 * HomePage.jsx — Landing page at route '/'.
 *
 * LAYOUT (two-column on large screens, stacked on small)
 *   ┌────────────────────────────┬──────────────────────┐
 *   │  Header (full width)       │                      │
 *   ├────────────────────────────┤                      │
 *   │  USMap (65% width)         │  Info Card (flex-1)  │
 *   │  Interactive choropleth    │  State profile panel │
 *   └────────────────────────────┴──────────────────────┘
 *
 * STATE
 *   hoveredState — set by USMap's onStateHover callback when the user mouses
 *                  over a highlighted state.  Drives the Info Card content.
 *
 * ========================================================================
 * TODO – Replace Dummy Data with Real Backend API
 * ========================================================================
 *
 * CURRENT IMPLEMENTATION
 *   Imports splash-states.json (src/dummy/) for the list of available states.
 *   splashData.states drives the badge list and is passed into <USMap>.
 *
 * REQUIRED API CALL
 *   HTTP Method: GET
 *   Endpoint:    /api/states
 *   Purpose:     Returns all states that have analysis data available.
 *
 * RESPONSE SNAPSHOT (keys only)
 * {
 *   states: [{
 *     stateId, stateName, hasData, numDistricts, isPreclearance,
 *     center: { lat, lng },
 *     zoom
 *   }]
 * }
 *
 * INTEGRATION INSTRUCTIONS
 *   1. Add: const [statesData, setStatesData] = useState([])
 *   2. useEffect(() => fetch('/api/states').then(r=>r.json()).then(setStatesData), [])
 *   3. Replace splashData.states with statesData in the badge list.
 *   4. Pass statesData into <USMap> so it knows which states are clickable.
 *
 * SEARCHABLE MARKER
 *   //CONNECT HERE: splashData import
 * ========================================================================
 */

import { useState } from 'react'
import { MapPin, BarChart2, MousePointerClick } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Card, CardContent } from '@/components/ui/card'
import USMap from '../components/maps/USMap'

//CONNECT HERE: splashData — replace with fetch('/api/states') in a useEffect, store result in useState
import splashData from '../dummy/splash-states.json'


/**
 * HomePage — Root landing page with the US map and state-hover info card.
 *
 * @returns {JSX.Element}
 */
export default function HomePage() {

    /* ── Step 0: Local hover state ────────────────────────────────────────── */
    /* hoveredState — set by USMap via onStateHover; null when no state is hovered.
     * Shape: { stateId, stateName, numDistricts, isPreclearance, ... } */
    const [hoveredState, setHoveredState] = useState(null)


    /* ── Step 1: Render ──────────────────────────────────────────────────── */
    return (
        <div className="flex flex-col h-full bg-brand-surface overflow-hidden">

{/* ── MAP + INFO CARD ──────────────────────────────────────────── */}
            <div className="flex flex-col lg:flex-row flex-1 gap-4 p-3 sm:p-4 lg:p-5 min-h-0">

                {/* ── MAP PANEL ────────────────────────────────────────────── */}
                <div className="rounded-xl overflow-hidden border border-brand-muted/25 shadow-sm h-[340px] sm:h-[440px] lg:h-auto lg:flex-[0_0_70%]">
                    <USMap onStateHover={setHoveredState} />
                </div>

                {/* ── INFO CARD ────────────────────────────────────────────── */}
                <div className="flex-1 min-w-0 flex flex-col min-h-[220px] lg:min-h-0">
                    <Card className="flex-1 p-0 border-brand-muted/25 shadow-sm">

                        {hoveredState ? (

                            /* ── HOVERED STATE PROFILE ───────────────────── */
                            <CardContent className="h-full flex flex-col items-center justify-center gap-6 text-center px-8">
                                <div className="flex flex-col items-center gap-1">
                                    <div className="flex items-center gap-2">
                                        <MapPin className="w-4 h-4 text-brand-muted" />
                                        <span className="text-brand-muted text-[10px] uppercase tracking-[0.18em] font-semibold">
                                            State Profile
                                        </span>
                                    </div>
                                    <p className="text-brand-darkest text-3xl font-bold tracking-tight">
                                        {hoveredState.stateName}
                                    </p>
                                </div>

                                <Separator className="bg-brand-muted/20 w-16" />

                                <div className="w-full flex flex-col gap-4">
                                    {/* Congressional district count */}
                                    <div className="flex items-center justify-between">
                                        <span className="text-brand-muted font-medium text-base">Congressional Districts</span>
                                        <span className="text-brand-darkest font-bold text-2xl tabular-nums">
                                            {hoveredState.numDistricts}
                                        </span>
                                    </div>

                                    {/* VRA preclearance status badge */}
                                    <div className="flex items-center justify-between">
                                        <span className="text-brand-muted font-medium text-base">VRA Preclearance</span>
                                        {hoveredState.isPreclearance ? (
                                            <Badge className="bg-brand-primary/10 text-brand-primary border-brand-primary/30 text-sm font-semibold px-3 py-1">
                                                Required
                                            </Badge>
                                        ) : (
                                            <Badge variant="outline" className="text-brand-muted border-brand-muted/40 text-sm px-3 py-1">
                                                Not Required
                                            </Badge>
                                        )}
                                    </div>
                                </div>

                                <Separator className="bg-brand-muted/20 w-full" />

                                {/* Click prompt */}
                                <div className="flex items-center justify-center gap-2 text-brand-muted/50">
                                    <MousePointerClick className="w-4 h-4" />
                                    <span className="text-sm">Click the state to begin analysis</span>
                                </div>
                            </CardContent>

                        ) : (

                            /* ── EMPTY STATE (no hover) ──────────────────── */
                            <CardContent className="h-full flex flex-col items-center justify-center gap-6 text-center px-8">
                                <div className="w-16 h-16 rounded-full bg-brand-muted/10 flex items-center justify-center ring-1 ring-brand-muted/20">
                                    <BarChart2 className="w-8 h-8 text-brand-muted/40" />
                                </div>

                                <div>
                                    <p className="text-brand-darkest font-bold text-lg">Select a State</p>
                                    <p className="font-semibold text-brand-muted/60 text-sm mt-2 leading-relaxed">
                                        Hover a highlighted state on the map to see its profile.
                                    </p>
                                </div>

                                <Separator className="bg-brand-muted/20 w-16" />

                                {/* Available-states badge list */}
                                <div className="flex flex-col items-center gap-2">
                                    <span className="font-semibold text-brand-muted text-[10px] uppercase tracking-widest">
                                        Available for Analysis
                                    </span>
                                    <div className="flex gap-2 flex-wrap justify-center">
                                        {splashData.states.map(s => (
                                            <Badge
                                                key={s.stateId}
                                                variant="outline"
                                                className="text-brand-deep border-brand-muted/40 bg-brand-muted/5 text-sm px-3 py-1"
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
