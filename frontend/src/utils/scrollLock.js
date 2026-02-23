/**
 * scrollLock.js — Prevents the scroll handler from fighting programmatic navigation.
 *
 * THE PROBLEM
 * When a user clicks a section in the sidebar (SectionPanel), the app calls
 * scrollIntoView({ behavior: 'smooth' }). During that animation, the scroll
 * event listener in useActiveSection.js would normally fire and update the
 * active section to whatever element happens to pass the trigger threshold —
 * causing flickering in the sidebar nav highlight.
 *
 * THE SOLUTION
 * A plain mutable object (not React state) acts as a shared flag.
 * SectionPanel calls lockScroll() before triggering navigation; useActiveSection
 * checks isScrollLocked() at the top of handleScroll and bails out early.
 * After `ms` milliseconds the lock auto-releases, restoring normal behavior.
 *
 * WHY NOT REACT STATE / REF
 * This flag is not owned by any component — it is a coordination mechanism
 * between an event emitter (SectionPanel) and a listener (useActiveSection)
 * that live in separate parts of the tree. A module-level variable is the
 * simplest correct solution.
 */


/* ── Step 0: Internal lock state ─────────────────────────────────────────────
 *  active  — true while a programmatic scroll is in flight
 *  timer   — handle to the auto-release setTimeout, kept so it can be cleared
 *             if lockScroll() is called again before the previous lock expires
 * ─────────────────────────────────────────────────────────────────────────── */
const lock = { active: false, timer: null }


/**
 * lockScroll — Activates the scroll lock for `ms` milliseconds.
 *
 * Called by SectionPanel immediately before invoking scrollIntoView().
 * Cancels any existing timer before starting a new one so rapid clicks
 * do not cause the lock to release early.
 *
 * @param {number} [ms=1000]  Lock duration in milliseconds.
 *                             1000 ms covers most smooth-scroll animations.
 *                             Sourced from SectionPanel's scrollToSection /
 *                             scrollToSubSection helpers.
 */
export function lockScroll(ms = 1000) {
    // Step 1: Cancel any in-flight auto-release timer
    if (lock.timer) clearTimeout(lock.timer)

    // Step 2: Activate the lock
    lock.active = true

    // Step 3: Schedule auto-release after `ms` ms
    lock.timer = setTimeout(() => { lock.active = false }, ms)
}


/**
 * isScrollLocked — Returns true while a programmatic scroll is in flight.
 *
 * Called at the top of useActiveSection's handleScroll() callback.
 * When true, the scroll listener returns immediately without updating
 * the active section in the Zustand store.
 *
 * @returns {boolean}  Current lock state.
 */
export function isScrollLocked() {
    return lock.active
}
