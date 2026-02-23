/**
 * MapFrame.jsx — Rounded clipping container for Leaflet map components.
 *
 * Wraps a map in `rounded-xl overflow-hidden` to clip the sharp map edges,
 * adds a subtle border and shadow for visual consistency with other panels.
 *
 * `overflow-hidden` is important here — without it, Leaflet's internal
 * elements can bleed outside the rounded corners.
 *
 * USAGE
 *   <MapFrame className="h-[400px]">
 *     <DistrictMap2024 stateId={stateId} ... />
 *   </MapFrame>
 */

import { cn } from "@/lib/utils"


/**
 * MapFrame — Clipping wrapper for Leaflet maps with rounded corners and shadow.
 *
 * @param {{ className?: string, [key: string]: any }} props
 *   className — Extra Tailwind classes (typically a height like "h-[400px]").
 *   ...props  — Forwarded to the underlying div (children, style, etc.).
 * @returns {JSX.Element}
 */
export default function MapFrame({ className, ...props }) {
    return (
        <div
            className={cn("rounded-xl overflow-hidden border border-brand-muted/25 shadow-sm", className)}
            {...props}
        />
    )
}
