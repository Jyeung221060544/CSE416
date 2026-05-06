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

import { useState, useEffect } from 'react'
import { MapPin, BarChart2, MousePointerClick } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Card, CardContent } from '@/components/ui/card'
import USMap from '../components/maps/USMap'
import { fetchStates } from '../api'
import { STATE_COLORS } from '../lib/partyColors'


/**
 * HomePage — Root landing page with the US map and state-hover info card.
 *
 * @returns {JSX.Element}
 */
export default function HomePage() {

    /* ── Step 0: Fetch states list from backend on mount ─────────────────── */
    const [states, setStates] = useState([])
    useEffect(() => {
        fetchStates()
            .then(data => setStates(data.states))
            .catch(err => console.error('[HomePage] fetchStates error:', err))
    }, [])

    /* ── Step 1: Local hover state ────────────────────────────────────────── */
    /* hoveredState — set by USMap via onStateHover; null when no state is hovered.
     * Shape: { stateId, stateName, numDistricts, isPreclearance, ... } */
    const [hoveredState, setHoveredState] = useState(null)


    /* ── Step 1: Render ──────────────────────────────────────────────────── */
    return (
        <div className="flex flex-col h-full overflow-hidden relative"
             style={{ background: 'linear-gradient(135deg, #FBFAFF 0%, #eeeeff 50%, #f3f0ff 100%)' }}>

            {/* Decorative background glow orbs */}
            <div className="absolute top-[-80px] right-[-80px] w-72 h-72 rounded-full pointer-events-none"
                 style={{ background: 'radial-gradient(circle, rgba(89,90,150,0.12) 0%, transparent 70%)' }} />
            <div className="absolute bottom-[-60px] left-[-60px] w-96 h-72 rounded-full pointer-events-none"
                 style={{ background: 'radial-gradient(circle, rgba(89,90,150,0.08) 0%, transparent 70%)' }} />

            {/* ── MAP + INFO CARD ──────────────────────────────────────────── */}
            <div className="flex flex-col lg:flex-row flex-1 gap-4 p-3 sm:p-4 lg:p-5 min-h-0 relative">

                {/* ── MAP PANEL ────────────────────────────────────────────── */}
                <div className="rounded-xl overflow-hidden border-2 border-brand-primary/30 shadow-lg h-[340px] sm:h-[440px] lg:h-auto lg:flex-[0_0_70%]">
                    <USMap states={states} onStateHover={setHoveredState} />
                </div>

                {/* ── INFO CARD ────────────────────────────────────────────── */}
                <div className="flex-1 min-w-0 flex flex-col min-h-[220px] lg:min-h-0">
                    <Card className="flex-1 p-0 border-brand-primary/20 shadow-lg overflow-hidden">

                        {hoveredState ? (

                            /* ── HOVERED STATE PROFILE ───────────────────── */
                            <CardContent className="h-full flex flex-col items-center justify-center gap-6 text-center px-8 relative">
                                {/* Top accent bar */}
                                <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-brand-primary via-indigo-400 to-purple-400" />

                                <div className="flex flex-col items-center gap-1">
                                    <div className="flex items-center gap-2">
                                        <MapPin className="w-4 h-4 text-brand-primary" />
                                        <span className="text-brand-primary text-[10px] uppercase tracking-[0.18em] font-semibold">
                                            State Profile
                                        </span>
                                    </div>
                                    <p className="text-brand-darkest text-3xl font-bold tracking-tight">
                                        {hoveredState.stateName}
                                        <span className="ml-2 text-brand-muted text-lg font-normal">({hoveredState.stateId})</span>
                                    </p>
                                </div>

                                <Separator className="bg-brand-primary/25 w-16" />

                                <div className="w-full flex flex-col gap-3">
                                    {/* Congressional district count */}
                                    <div className="flex items-center justify-between bg-brand-primary/5 border border-brand-primary/15 rounded-lg px-4 py-2.5">
                                        <span className="text-brand-muted font-medium text-base">Congressional Districts</span>
                                        <span className="text-brand-darkest font-bold text-2xl tabular-nums">
                                            {hoveredState.numDistricts}
                                        </span>
                                    </div>

                                    {/* VRA preclearance status badge */}
                                    <div className="flex items-center justify-between bg-brand-primary/5 border border-brand-primary/15 rounded-lg px-4 py-2.5">
                                        <span className="text-brand-muted font-medium text-base">VRA Preclearance</span>
                                        {hoveredState.isPreclearance ? (
                                            <Badge className="bg-brand-primary/15 text-brand-primary border-brand-primary/30 text-sm font-semibold px-3 py-1">
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
                                <div className="flex items-center justify-center gap-2 text-brand-primary/60">
                                    <MousePointerClick className="w-4 h-4" />
                                    <span className="text-sm">Click the state to begin analysis</span>
                                </div>
                            </CardContent>

                        ) : (

                            /* ── EMPTY STATE (no hover) ──────────────────── */
                            <CardContent className="h-full flex flex-col items-center justify-center gap-6 text-center px-8 relative">
                                {/* Top accent bar */}
                                <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-brand-primary via-indigo-400 to-purple-400" />

                                <div className="w-16 h-16 rounded-full bg-brand-primary/12 flex items-center justify-center ring-2 ring-brand-primary/20">
                                    <BarChart2 className="w-8 h-8 text-brand-primary/60" />
                                </div>

                                <div>
                                    <p className="text-brand-darkest font-bold text-lg">Select a State</p>
                                    <p className="font-semibold text-brand-muted/60 text-sm mt-2 leading-relaxed">
                                        Hover a highlighted state on the map to see its profile.
                                    </p>
                                </div>

                                <Separator className="bg-brand-primary/20 w-16" />

                                {/* Available-states badge list */}
                                <div className="flex flex-col items-center gap-2">
                                    <span className="font-semibold text-brand-primary/70 text-[10px] uppercase tracking-widest">
                                        Available for Analysis
                                    </span>
                                    <div className="flex gap-2 flex-wrap justify-center">
                                        {states.map(s => (
                                            <Badge
                                                key={s.stateId}
                                                variant="outline"
                                                className={`text-sm px-3 py-1 font-semibold ${STATE_COLORS[s.stateId]?.badge ?? 'text-brand-primary border-brand-primary/35 bg-brand-primary/8'}`}
                                            >
                                                {s.stateName}
                                                <span className="ml-1.5 opacity-60 text-xs font-normal">({s.stateId})</span>
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
