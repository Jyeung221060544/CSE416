/**
 * InfoCallout.jsx — Dashed-border callout box for contextual hints and explanations.
 *
 * Renders an icon badge on the left and a text paragraph on the right.
 * Used throughout section components to explain UI interactions or data context.
 *
 * USAGE
 *   <InfoCallout icon={MousePointerClick}>
 *     Click a row to highlight the district on the map.
 *   </InfoCallout>
 *
 *   <InfoCallout icon={Lightbulb} className="mt-4">
 *     <span className="font-semibold">Feasible</span> means VAP ≥ 400k.
 *   </InfoCallout>
 */

import { cn } from "@/lib/utils"


/**
 * InfoCallout — Bordered callout with an icon circle and descriptive text.
 *
 * @param {{ icon?: React.ComponentType, children: ReactNode, className?: string }} props
 *   icon      — A Lucide icon component (e.g. MousePointerClick, Lightbulb).
 *               Rendered inside a small rounded circle. Omit to show no icon.
 *   children  — The callout body text or JSX (supports inline formatting).
 *   className — Extra Tailwind classes merged onto the outer wrapper div.
 * @returns {JSX.Element}
 */
export default function InfoCallout({ icon: Icon, children, className }) {
    return (
        <div className={cn(
            "flex items-center gap-3 px-3 py-3 sm:px-4 sm:py-4 rounded-xl border border-dashed border-brand-muted/40 bg-brand-primary/[0.03]",
            className
        )}>
            {/* ── ICON CIRCLE ──────────────────────────────────────────────── */}
            <div className="shrink-0 w-7 h-7 sm:w-9 sm:h-9 rounded-full bg-brand-primary/10 flex items-center justify-center">
                {Icon ? <Icon className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-brand-primary" /> : null}
            </div>

            {/* ── BODY TEXT ────────────────────────────────────────────────── */}
            <p className="text-xs sm:text-sm text-brand-muted/70 leading-relaxed">
                {children}
            </p>
        </div>
    )
}
