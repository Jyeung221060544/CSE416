import { cn } from "@/lib/utils"

export default function SurfacePanel({ className, ...props }) {
  return <div className={cn("rounded-xl border shadow-sm", className)} {...props} />
}
