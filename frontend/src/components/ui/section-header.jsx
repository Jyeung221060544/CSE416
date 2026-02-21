import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

export default function SectionHeader({ title, className, separatorClassName }) {
  return (
    <div className={cn("flex items-center gap-3 mb-4", className)}>
      <h3 className="text-base font-bold uppercase tracking-widest text-brand-deep shrink-0">
        {title}
      </h3>
      <Separator className={cn("flex-1 bg-brand-muted/25", separatorClassName)} />
    </div>
  )
}
