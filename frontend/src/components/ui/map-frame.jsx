import { cn } from "@/lib/utils"

export default function MapFrame({ className, ...props }) {
  return (
    <div
      className={cn("rounded-xl overflow-hidden border border-brand-muted/25 shadow-sm", className)}
      {...props}
    />
  )
}
