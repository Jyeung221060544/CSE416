/**
 * main.jsx — Application entry point.
 *
 * Responsibilities:
 *   1. Define the client-side route tree (React Router v6 data router).
 *   2. Mount the React app into the #root <div> in index.html.
 *   3. Import global CSS so it applies to the entire app.
 *
 * ROUTE STRUCTURE
 *   /                     → MainLayout (persistent navbar shell)
 *   ├── index             → HomePage   (US map + state selector)
 *   └── state/:stateId    → StatePage  (full analysis view for one state)
 *
 * LAYOUT PATTERN
 *   MainLayout renders <Navbar> and an <Outlet />.
 *   React Router replaces <Outlet /> with the matched child route component
 *   (HomePage or StatePage) while keeping the Navbar visible at all times.
 */

import React from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import MainLayout from './layout/MainLayout'
import Home from './pages/HomePage'
import StatePage from './pages/StatePage'

// Step 0: Import global design-system styles (Tailwind + brand tokens)
import './index.css'

// Step 1: Import Leaflet's default CSS (required for map tiles + controls)
import 'leaflet/dist/leaflet.css'


/* ── Step 2: Define the route tree ──────────────────────────────────────────
 *
 *  createBrowserRouter uses the HTML5 History API (no hash in URLs).
 *  The nested children array renders inside <Outlet /> in MainLayout.
 *
 *  path: '/'               → matches the root URL
 *  index: true             → default child when no sub-path is matched
 *  path: 'state/:stateId'  → :stateId is a dynamic segment read by useStateData
 *                             via React Router's useParams()
 * ─────────────────────────────────────────────────────────────────────────── */
const router = createBrowserRouter([
    {
        path: '/',
        element: <MainLayout />,
        children: [
            { index: true,               element: <Home /> },
            { path: 'state/:stateId',    element: <StatePage /> },
        ],
    },
])


/* ── Step 3: Mount the app ───────────────────────────────────────────────────
 *
 *  createRoot() targets the <div id="root"> in public/index.html.
 *  React.StrictMode enables extra development warnings (double-invokes
 *  effects and renders in development only — no production impact).
 * ─────────────────────────────────────────────────────────────────────────── */
ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <RouterProvider router={router} />
    </React.StrictMode>
)