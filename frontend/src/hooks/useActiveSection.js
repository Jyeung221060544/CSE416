import { useEffect, useRef } from 'react'
import useAppStore from '../store/useAppStore'
import { isScrollLocked } from '../utils/scrollLock'

const SECTION_IDS = [
    'state-overview',
    'demographic',
    'racial-polarization',
    'ensemble-analysis',
]

/**
 * Attaches a scroll listener to scrollRef and updates activeSection in Zustand
 * whenever the visible section changes.
 * Trigger threshold adapts to scroll direction:
 *   DOWN → 30% from viewport top (eager — register new section early)
 *   UP   → 50% (previous section must fill half the viewport to re-activate)
 * Scroll events are ignored while isScrollLocked() to prevent flickering when
 * SectionPanel triggers a programmatic scrollIntoView.
 *
 * @param {React.RefObject<HTMLElement>} scrollRef - Ref to the scrollable container.
 */
export default function useActiveSection(scrollRef) {

    const setActiveSection = useAppStore((state) => state.setActiveSection)
    const lastScrollTop = useRef(0)

    useEffect(() => {
        const container = scrollRef.current
        if (!container) return

        const handleScroll = () => {
            if (isScrollLocked()) return

            const { scrollTop, clientHeight } = container

            const goingUp = scrollTop < lastScrollTop.current
            lastScrollTop.current = scrollTop

            const triggerY = scrollTop + clientHeight * (goingUp ? 0.5 : 0.3)

            let activeId = SECTION_IDS[0]
            for (const id of SECTION_IDS) {
                const el = document.getElementById(id)
                if (el && el.offsetTop <= triggerY) activeId = id
            }
            setActiveSection(activeId)
        }

        container.addEventListener('scroll', handleScroll, { passive: true })
        return () => container.removeEventListener('scroll', handleScroll)
    }, [scrollRef, setActiveSection])
}
