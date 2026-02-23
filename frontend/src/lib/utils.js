/**
 * utils.js — General-purpose utility functions.
 *
 * Currently exports only `cn`, the standard Tailwind class-merging helper
 * used throughout the component library (Shadcn pattern).
 */

import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * cn — Merge and deduplicate Tailwind utility class strings.
 *
 * Combines clsx (conditional class joining) with tailwind-merge
 * (conflict resolution — e.g. "p-2 p-4" becomes "p-4").
 *
 * @param   {...(string|string[]|Record<string,boolean>|null|undefined)} inputs
 *          Any mix of class strings, arrays, objects, null, or undefined.
 *          Sourced from the component's className prop and internal defaults.
 *
 * @returns {string}  A single deduplicated, conflict-resolved class string
 *                    safe to pass to a JSX className attribute.
 *
 * @example
 *   cn("px-4 py-2", isActive && "bg-brand-primary", className)
 *   // → "px-4 py-2 bg-brand-primary extra-class"
 */
export function cn(...inputs) {
    return twMerge(clsx(inputs))
}
