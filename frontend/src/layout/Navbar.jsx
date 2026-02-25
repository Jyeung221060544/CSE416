/**
 * Navbar.jsx — Persistent top navigation bar.
 *
 * Renders inside MainLayout and is visible on every page.
 *
 * CONTENTS (left → right)
 *   Left:  App title  →  state badge (shown only on /state/:stateId pages)
 *   Right: Course label  →  Home button (disabled when already on home page)
 *
 * STATE SOURCES
 *   selectedState   — from Zustand; set by useStateData when URL param changes
 *   resetFilters    — Zustand action; called when navigating home
 *   setSelectedState — Zustand action; clears state on home navigation
 *   location        — from React Router; used to detect current page type
 */

import { useNavigate, useLocation } from 'react-router-dom'
import useAppStore from '../store/useAppStore'
import { Home } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

/**
 * Navbar — Fixed-height top bar with app branding and home navigation.
 *
 * @returns {JSX.Element}
 */
export default function Navbar() {

    /* ── Step 0: Routing and global state ────────────────────────────────── */
    const navigate  = useNavigate()
    const location  = useLocation()

    const { selectedState, resetFilters, setSelectedState } = useAppStore()

    /* ── Step 1: Derive page-type flags from the current URL ─────────────── */
    const isStatePage = location.pathname.startsWith('/state/')
    const isHomePage  = location.pathname === '/'

    // Tailwind override for Lucide icon size inside this navbar's buttons
    const iconSize = "[&_svg]:!w-6 [&_svg]:!h-6"


    /* ── Step 2: Home navigation handler ─────────────────────────────────── */
    /**
     * handleHome — Clears all filters + selected state, then navigates to '/'.
     *
     * Called when the user clicks the Home button.
     * Resets filters first so the state page doesn't retain stale filter
     * values if the user navigates to a different state later.
     */
    const handleHome = () => {
        resetFilters()          // clear all sidebar filter selections
        setSelectedState(null)  // clear the navbar state badge
        navigate('/')           // navigate to the home page
    }


    /* ── Step 3: Render ──────────────────────────────────────────────────── */
    return (
        <nav className="h-14 bg-white border-b border-brand-muted/40 flex items-center justify-between px-6 shrink-0">

            {/* ── LEFT: App title + current state badge ──────────────────── */}
            <div className="flex items-center gap-3">
                <span className="text-brand-darkest font-semibold text-xl tracking-wide">
                    Voting Rights Act Redistricting
                </span>

                {/* State badge: only visible on /state/:stateId pages */}
                {isStatePage && selectedState && (
                    <>
                        <Separator orientation="vertical" className="h-5 bg-brand-muted/40" />
                        <Badge
                            variant="outline"
                            className="text-brand-deep border-brand-muted bg-brand-surface font-medium"
                        >
                            {selectedState}
                        </Badge>
                    </>
                )}
            </div>

            {/* ── RIGHT: Course label + Home button ──────────────────────── */}
            <div className="flex items-center gap-4">

                {/* Course / team label (hidden on small screens) */}
                <span className="text-black text-sm font-medium tracking-widest uppercase hidden sm:block">
                    CSE416 · Cubs
                </span>
                <Separator orientation="vertical" className="h-5 bg-brand-muted/30 hidden sm:block" />

                {/* Home button — disabled when already on the home page */}
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleHome}
                    disabled={isHomePage}
                    className={`
                        flex items-center gap-1
                        ${isHomePage
                            ? 'text-brand-darkest cursor-not-allowed'
                            : 'bg-brand-darkest text-white hover:bg-brand-deep hover:text-white shadow-sm'
                        }
                        ${iconSize}
                    `}
                >
                    <Home />
                    <span className="hidden sm:inline">Home</span>
                </Button>

            </div>
        </nav>
    )
}
