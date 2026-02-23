/**
 * SectionHeader.jsx — Labeled horizontal divider used above chart/table blocks.
 *
 * Renders a bold uppercase title followed by a Separator that stretches to
 * fill the remaining width.  Used throughout section components to separate
 * named visual blocks (e.g. "Gingles Scatter Plot", "Population by Group").
 *
 * USAGE
 *   <SectionHeader title="Ensemble Splits" />
 *   <SectionHeader title="Custom Title" className="mb-6" separatorClassName="bg-red-200" />
 */

import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"


/**
 * SectionHeader — Uppercase title + full-width separator divider.
 *
 * @param {{ title: string, className?: string, separatorClassName?: string }} props
 *   title               — The label text (rendered uppercase + bold).
 *   className           — Extra Tailwind classes for the outer wrapper div.
 *   separatorClassName  — Extra Tailwind classes for the Separator line.
 * @returns {JSX.Element}
 */
export default function SectionHeader({ title, className, separatorClassName }) {
    return (
        <div className={cn("flex items-center gap-3 mb-4", className)}>
            {/* Title — shrink-0 prevents it from being squished by the separator */}
            <h3 className="text-base font-bold uppercase tracking-widest text-brand-deep shrink-0">
                {title}
            </h3>
            {/* Separator fills remaining horizontal space after the title */}
            <Separator className={cn("flex-1 bg-brand-muted/25", separatorClassName)} />
        </div>
    )
}
