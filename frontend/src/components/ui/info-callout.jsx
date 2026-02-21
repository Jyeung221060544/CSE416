import { cn } from "@/lib/utils"

export default function InfoCallout({ icon: Icon, children, className }) {
  return (
    <div className={cn("flex items-center gap-3 px-3 py-3 sm:px-4 sm:py-4 rounded-xl border border-dashed border-brand-muted/40 bg-brand-primary/[0.03]", className)}>
      <div className="shrink-0 w-7 h-7 sm:w-9 sm:h-9 rounded-full bg-brand-primary/10 flex items-center justify-center">
        {Icon ? <Icon className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-brand-primary" /> : null}
      </div>
      <p className="text-xs sm:text-sm text-brand-muted/70 leading-relaxed">
        {children}
      </p>
    </div>
  )
}
