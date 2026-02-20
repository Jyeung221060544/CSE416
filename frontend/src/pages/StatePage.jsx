import { useEffect, useRef } from 'react'
import Sidebar from '../layout/Sidebar'
import StateOverviewSection from '../components/sections/StateOverviewSection'
import DemographicSection from '../components/sections/DemographicSection'
import RacialPolarizationSection from '../components/sections/RacialPolarizationSection'
import EnsembleAnalysisSection from '../components/sections/EnsembleAnalysisSection'
import useAppStore from '../store/useAppStore'
import { isScrollLocked } from '../utils/scrollLock'

const SECTION_IDS = ['state-overview', 'demographic', 'racial-polarization', 'ensemble-analysis']

export default function StatePage() {
    const setActiveSection = useAppStore((state) => state.setActiveSection)
    const scrollRef = useRef(null)

    const lastScrollTop = useRef(0)

    useEffect(() => {
        const container = scrollRef.current
        if (!container) return

        const handleScroll = () => {
            if (isScrollLocked()) return
            const { scrollTop, clientHeight } = container
            const goingUp = scrollTop < lastScrollTop.current
            lastScrollTop.current = scrollTop

            // Scrolling down: switch at 30% from top (eager).
            // Scrolling up: switch at 50% from top so ~half the prev section must be visible first.
            const triggerY = scrollTop + clientHeight * (goingUp ? 0.5 : 0.3)

            let activeId = SECTION_IDS[0]
            for (const id of SECTION_IDS) {
                const el = document.getElementById(id)
                if (el && el.offsetTop <= triggerY) {
                    activeId = id
                }
            }
            setActiveSection(activeId)
        }

        container.addEventListener('scroll', handleScroll, { passive: true })
        return () => container.removeEventListener('scroll', handleScroll)
    }, [setActiveSection])

    return (
        <div className="flex h-full overflow-hidden">
            {/* ── Sidebar ────────────────────────────────────── */}
            <Sidebar />

            {/* ── Main Content ───────────────────────────────── */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto bg-gray-50">
                <div className="flex flex-col gap-0">
                    <StateOverviewSection />
                    <DemographicSection />
                    <RacialPolarizationSection />
                    <EnsembleAnalysisSection />
                </div>
            </div>
        </div>
    )
}
