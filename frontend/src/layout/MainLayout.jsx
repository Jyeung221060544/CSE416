/**
 * MainLayout.jsx — Persistent shell rendered for every route.
 *
 * Structure:
 *   ┌─────────────────────────────────────┐
 *   │  Navbar  (fixed height, h-14)       │
 *   ├─────────────────────────────────────┤
 *   │ <Outlet />  (fills remaining space) │
 *   │ -HomePage or StatePage renders here │
 *   └─────────────────────────────────────┘
 *
 * React Router's <Outlet /> is replaced at runtime with the matched child
 * route component (see main.jsx for the route tree).
 * overflow-hidden on <main> ensures the inner page can scroll independently
 * without causing the entire viewport to scroll.
 */

import Navbar from './Navbar'
import { Outlet } from 'react-router-dom'

/**
 * MainLayout — Top-level layout wrapper present on every page.
 *
 * @returns {JSX.Element}  Full-screen flex column with Navbar on top
 *                         and the current page filling the rest.
 */
export default function MainLayout() {

    /* ── Step 0: Render the persistent shell ─────────────────────────────── */
    return (
        <div className="flex flex-col h-screen bg-white text-black">

            {/* ── NAVBAR ──────────────────────────────────────────────────── */}
            {/* Fixed-height top bar with app title, breadcrumb, and home button */}
            <Navbar />

            {/* ── PAGE CONTENT ─────────────────────────────────────────────── */}
            {/* overflow-hidden so the child page manages its own scroll container */}
            <main className="flex-1 overflow-hidden">
                <Outlet />
            </main>

        </div>
    )
}