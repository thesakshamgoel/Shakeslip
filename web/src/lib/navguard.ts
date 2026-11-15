/* One place that can stop an in-app navigation, so unsaved work is never dropped silently.
   Links are caught by the editor itself; buttons and the search palette that navigate in code ask here first. */
type Guard = (to: string) => boolean
let guard: Guard | null = null
export const setNavGuard = (g: Guard | null) => { guard = g }
/* true when something (the open editor) took over to ask first */
export const navBlocked = (to: string) => !!guard && guard(to)
