// Shared mutable flag — not React state, intentionally.
// Lets SectionPanel tell StatePage's scroll handler to stand down
// while a programmatic scrollIntoView animation is in flight.
const lock = { active: false, timer: null }

export function lockScroll(ms = 1000) {
    if (lock.timer) clearTimeout(lock.timer)
    lock.active = true
    lock.timer = setTimeout(() => { lock.active = false }, ms)
}

export function isScrollLocked() {
    return lock.active
}
