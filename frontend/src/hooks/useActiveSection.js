/**
 * useActiveSection.js — Tracks which page section is currently in view.
 *
 * Attaches a scroll listener to the main content container (passed in via
 * scrollRef from StatePage) and updates the Zustand store whenever the
 * visible section or sub-section changes.
 *
 * SCROLL LOCK INTEGRATION
 * When the user clicks a sidebar nav item, SectionPanel calls lockScroll()
 * from utils/scrollLock.js before triggering scrollIntoView(). This hook
 * checks isScrollLocked() at the top of handleScroll and ignores scroll
 * events during that window, preventing the sidebar from flickering.
 *
 * TRIGGER THRESHOLD LOGIC
 * The trigger point adapts based on scroll direction:
 *   Scrolling DOWN → trigger at 30% from the top of the viewport (eager — the
 *                    next section becomes active early as the user reaches it)
 *   Scrolling UP   → trigger at 50% (the previous section must fill half the
 *                    viewport before it becomes active again)
 */

import { useEffect, useRef } from 'react'
import useAppStore from '../store/useAppStore'
import { isScrollLocked } from '../utils/scrollLock'


/* ── Step 0: Static section / sub-section ID lists ───────────────────────────
 *
 *  SECTION_IDS     — ordered top-to-bottom, matching the id="" attributes on
 *                    each <section> element in StatePage.
 *  SUB_SECTIONS    — maps a parent section id to its ordered sub-section ids.
 *                    Only sections that have sub-sections are listed.
 * ─────────────────────────────────────────────────────────────────────────── */
const SECTION_IDS = [
    'state-overview',
    'demographic',
    'racial-polarization',
    'ensemble-analysis',
]

const SUB_SECTIONS = {
    'racial-polarization': ['gingles-analysis', 'ecological-inference'],
    'ensemble-analysis':   ['ensemble-splits',  'box-whisker'],
}


/**
 * useActiveSection — Subscribes to scroll events and updates active section state.
 *
 * @param {React.RefObject<HTMLElement>} scrollRef
 *        Ref to the scrollable container div in StatePage.
 *        The scroll listener is attached to this element (not window).
 *
 * SIDE EFFECTS
 *   Calls setActiveSection(id) whenever the main active section changes.
 *   Calls setActiveSubSection(id) whenever a sub-section becomes active.
 *   Both write to the Zustand store, which updates the sidebar nav highlight
 *   and the FilterPanel (which shows context-sensitive filters per section).
 */
export default function useActiveSection(scrollRef) {

    /* ── Step 1: Subscribe to the Zustand setters (not values — no re-renders) */
    const setActiveSection    = useAppStore((state) => state.setActiveSection)
    const setActiveSubSection = useAppStore((state) => state.setActiveSubSection)

    // Track previous scroll position to determine direction
    const lastScrollTop = useRef(0)


    /* ── Step 2: Attach the scroll listener on mount, detach on unmount ─────── */
    useEffect(() => {
        const container = scrollRef.current
        if (!container) return

        const handleScroll = () => {
            // Step 3: Bail out while a programmatic scrollIntoView is running
            if (isScrollLocked()) return

            const { scrollTop, clientHeight } = container

            // Step 4: Determine scroll direction for adaptive threshold
            const goingUp = scrollTop < lastScrollTop.current
            lastScrollTop.current = scrollTop

            /*
             * Step 5: Compute the Y position used to decide which section is active.
             *   DOWN → 30% from viewport top (eager, register new section early)
             *   UP   → 50% (section must occupy the upper half to re-activate)
             */
            const triggerY = scrollTop + clientHeight * (goingUp ? 0.5 : 0.3)

            /* ── Step 6: Main section detection ──────────────────────────────
             *  Walk the ordered list; the last section whose top edge is at or
             *  above triggerY becomes the active one.
             */
            let activeId = SECTION_IDS[0]
            for (const id of SECTION_IDS) {
                const el = document.getElementById(id)
                if (el && el.offsetTop <= triggerY) activeId = id
            }
            setActiveSection(activeId)

            /* ── Step 7: Sub-section detection ───────────────────────────────
             *  Only runs when the active section has sub-sections.
             *  Same "last element whose top is at/above triggerY" logic.
             */
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

        // Step 8: Add listener (passive = browser can optimize scroll performance)
        container.addEventListener('scroll', handleScroll, { passive: true })

        // Step 9: Cleanup — remove listener when component unmounts or deps change
        return () => container.removeEventListener('scroll', handleScroll)
    }, [scrollRef, setActiveSection, setActiveSubSection])
}
