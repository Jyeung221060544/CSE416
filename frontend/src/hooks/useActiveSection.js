import { useEffect, useRef } from 'react'
import useAppStore from '../store/useAppStore'
import { isScrollLocked } from '../utils/scrollLock'

const SECTION_IDS = ['state-overview', 'demographic', 'racial-polarization', 'ensemble-analysis']

// Sub-sections nested inside a parent section
const SUB_SECTIONS = {
    'racial-polarization': ['gingles-analysis', 'ecological-inference'],
}

export default function useActiveSection(scrollRef) {
    const setActiveSection    = useAppStore((state) => state.setActiveSection)
    const setActiveSubSection = useAppStore((state) => state.setActiveSubSection)
    const lastScrollTop = useRef(0)

    useEffect(() => {
        const container = scrollRef.current
        if (!container) return

        const handleScroll = () => {
            if (isScrollLocked()) return
            const { scrollTop, clientHeight } = container
            const goingUp = scrollTop < lastScrollTop.current
            lastScrollTop.current = scrollTop

            // down: trigger at 30% from top (eager), up: 50% (must see half the prev section)
            const triggerY = scrollTop + clientHeight * (goingUp ? 0.5 : 0.3)

            // ── Main section detection ──────────────────────────
            let activeId = SECTION_IDS[0]
            for (const id of SECTION_IDS) {
                const el = document.getElementById(id)
                if (el && el.offsetTop <= triggerY) activeId = id
            }
            setActiveSection(activeId)

            // ── Sub-section detection ───────────────────────────
            const subs = SUB_SECTIONS[activeId]
            if (subs?.length) {
                let activeSubId = subs[0]
                for (const subId of subs) {
                    const el = document.getElementById(subId)
                    if (el && el.offsetTop <= triggerY) activeSubId = subId
                }
                setActiveSubSection(activeSubId)
            }
        }

        container.addEventListener('scroll', handleScroll, { passive: true })
        return () => container.removeEventListener('scroll', handleScroll)
    }, [scrollRef, setActiveSection, setActiveSubSection])
}
