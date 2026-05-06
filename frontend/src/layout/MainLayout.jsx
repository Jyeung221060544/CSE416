

import Navbar from './Navbar'
import { Outlet } from 'react-router-dom'

/**
 * MainLayout — Top-level layout wrapper present on every page.
 *
 * @returns {JSX.Element}  Full-screen flex column with Navbar on top
 *                         and the current page filling the rest.
 */
export default function MainLayout() {
    return (
        <div className="flex flex-col h-screen bg-white text-black">
            <Navbar />
            <main className="flex-1 overflow-hidden">
                <Outlet />
            </main>
        </div>
    )
}