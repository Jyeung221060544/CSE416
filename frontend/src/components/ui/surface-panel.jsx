/**
 * SurfacePanel.jsx — Lightweight rounded card wrapper for floating content blocks.
 *
 * A thin presentational div with `rounded-xl border shadow-sm` applied by default.
 * Accepts className for additional Tailwind overrides and spreads all other props
 * to the underlying div (e.g. style, onClick, children).
 *
 * Used for: HeatmapLegend, any small floating info panels inside section components.
 *
 * USAGE
 *   <SurfacePanel className="p-4 bg-white">
 *     content here
 *   </SurfacePanel>
 */

import { cn } from "@/lib/utils"


/**
 * SurfacePanel — Rounded bordered container div with a soft shadow.
 *
 * @param {{ className?: string, [key: string]: any }} props
 *   className — Additional Tailwind classes merged with the base styles.
 *   ...props  — Any other valid div props (children, style, etc.).
 * @returns {JSX.Element}
 */
export default function SurfacePanel({ className, ...props }) {
    return <div className={cn("rounded-xl border shadow-sm", className)} {...props} />
}
