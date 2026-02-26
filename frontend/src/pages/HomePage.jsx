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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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

            {/* ── PAGE HEADER ──────────────────────────────────────────────── */}
            {/* Fixed-height header with app subtitle and page title */}
            <div className="shrink-0 px-4 sm:px-8 lg:px-10 py-4 border-b border-brand-muted/30">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-muted mb-0">
                    Voting Rights Act · Redistricting Analysis
                </p>
                <h1 className="text-2xl sm:text-3xl font-bold text-brand-darkest tracking-tight">
                    Redistricting Explorer
                </h1>
                <p className="text-brand-muted/70 text-sm mt-1">
                    Analyze the Impact of the Voting Rights Act on Minorities
                </p>
            </div>

            {/* ── MAP + INFO CARD ──────────────────────────────────────────── */}
            {/* flex-row on large screens; stacked column on small screens */}
            <div className="flex flex-col lg:flex-row flex-1 gap-5 p-4 sm:p-6 lg:p-8 min-h-0">

                {/* ── MAP PANEL ────────────────────────────────────────────── */}
                {/* USMap fires onStateHover(stateObj) when the user hovers a state.
                    Highlighted states are determined by the splashData list. */}
                <div className="rounded-xl overflow-hidden border border-brand-muted/25 shadow-sm h-[280px] sm:h-[360px] lg:h-auto lg:flex-[0_0_65%]">
                    <USMap onStateHover={setHoveredState} />
                </div>

                {/* ── INFO CARD ────────────────────────────────────────────── */}
                {/* Shows state profile details when hoveredState is set,
                    otherwise shows the empty / call-to-action state. */}
                <div className="flex-1 min-w-0 flex flex-col min-h-[220px] lg:min-h-0">
                    <Card className="flex-1 p-0 border-brand-muted/25 shadow-sm">

                        {hoveredState ? (

                            /* ── HOVERED STATE PROFILE ───────────────────── */
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
                                    {/* Congressional district count */}
                                    <div className="flex items-center justify-between">
                                        <span className="text-brand-muted font-medium text-sm">Congressional Districts</span>
                                        <span className="text-brand-darkest font-bold text-xl tabular-nums">
                                            {hoveredState.numDistricts}
                                        </span>
                                    </div>

                                    {/* VRA preclearance status badge */}
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

                                    {/* Click prompt */}
                                    <div className="flex items-center justify-center gap-2 text-brand-muted/50">
                                        <MousePointerClick className="w-3.5 h-3.5" />
                                        <span className="text-xs">Click the state to begin analysis</span>
                                    </div>
                                </CardContent>
                            </>

                        ) : (

                            /* ── EMPTY STATE (no hover) ──────────────────── */
                            /* Shows the available-states badge list until a state is hovered */
                            <CardContent className="flex-1 flex flex-col items-center justify-center gap-5 text-center px-8 py-8">
                                <div className="w-14 h-14 rounded-full bg-brand-muted/10 flex items-center justify-center ring-1 ring-brand-muted/20">
                                    <BarChart2 className="w-6 h-6 text-brand-muted/40" />
                                </div>

                                <div>
                                    <p className="text-brand-darkest font-bold text-base">Select a State</p>
                                    <p className="font-semibold text-brand-muted/60 text-sm mt-1 leading-relaxed">
                                        Hover over a highlighted state on the map to analyze its profile.
                                    </p>
                                </div>

                                <Separator className="bg-brand-muted/20 w-12" />

                                {/* Available-states badge list — sourced from splashData (replace with API) */}
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
