/**
 * PortalTooltip — Renders tooltip content at document.body via a React portal,
 * positioned at the cursor. Flips to the right side of the cursor when near the
 * left edge of the viewport (e.g. when a sidebar would clip a left-anchored tooltip).
 *
 * Usage: wrap your tooltip JSX in <PortalTooltip>{content}</PortalTooltip>.
 * Nivo's own TooltipWrapper will be empty; the visible content lives at body level.
 */

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

/* Track cursor position globally without re-rendering the whole tree */
let _mouseX = 0
let _mouseY = 0
if (typeof window !== 'undefined') {
    document.addEventListener('mousemove', e => { _mouseX = e.clientX; _mouseY = e.clientY }, { passive: true })
}

const OFFSET   = 14   // px gap between cursor and tooltip edge
const PADDING  =  8   // min distance from viewport edges
const FLIP_AT  = 320  // px from left edge — flip to right-of-cursor beyond this

export default function PortalTooltip({ children }) {
    const ref = useRef(null)
    const [pos, setPos] = useState({ left: -9999, top: -9999 })

    // Re-position on every animation frame while mounted
    useLayoutEffect(() => {
        let raf
        function update() {
            const el = ref.current
            if (!el) { raf = requestAnimationFrame(update); return }

            const w   = el.offsetWidth  || 260
            const h   = el.offsetHeight || 40
            const vpW = window.innerWidth
            const vpH = window.innerHeight
            const cx  = _mouseX
            const cy  = _mouseY

            // Default: to the left of cursor. Flip right when cursor is near left edge.
            let left = cx < FLIP_AT
                ? cx + OFFSET                  // near left → show to the right
                : cx - w - OFFSET              // otherwise  → show to the left

            // Clamp horizontally
            left = Math.max(PADDING, Math.min(vpW - w - PADDING, left))

            // Vertically centre on cursor, then clamp
            let top = cy - h / 2
            top = Math.max(PADDING, Math.min(vpH - h - PADDING, top))

            setPos({ left, top })
            raf = requestAnimationFrame(update)
        }
        raf = requestAnimationFrame(update)
        return () => cancelAnimationFrame(raf)
    }, [])

    return createPortal(
        <div
            ref={ref}
            style={{ position: 'fixed', left: pos.left, top: pos.top, zIndex: 99999, pointerEvents: 'none' }}
        >
            {children}
        </div>,
        document.body
    )
}
