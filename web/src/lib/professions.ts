/* Profession presets tailor suggestions: service shortcuts, starter wording and terms. */
export type Profession = { id: string; label: string; blurb: string; services: string[] }

export const PROFESSIONS: Profession[] = [
  { id: 'video', label: 'Video and photography', blurb: 'Shoots, edits, grading, sound', services: ['Cinematography', 'Editing', 'Colour grading', 'Sound design', 'Photography', 'Drone footage', 'Motion graphics'] },
  { id: 'design', label: 'Design and branding', blurb: 'Logos, identity, print, social', services: ['Logo design', 'Brand identity', 'Packaging', 'Brochure', 'Social media creatives', 'Illustration'] },
  { id: 'software', label: 'Software and web', blurb: 'Websites, apps, maintenance', services: ['Website design', 'Web development', 'App development', 'UI/UX design', 'Hosting and maintenance', 'SEO'] },
  { id: 'consulting', label: 'Consulting and services', blurb: 'Advice, retainers, hourly work', services: ['Consulting', 'Strategy session', 'Monthly retainer', 'Training workshop', 'Audit and report'] },
  { id: 'events', label: 'Events and weddings', blurb: 'Planning, decor, entertainment', services: ['Event planning', 'Decor', 'Catering', 'Live music', 'Anchoring', 'Venue coordination'] },
  { id: 'general', label: 'Something else', blurb: 'A clean, general setup', services: ['Professional services', 'Materials', 'Travel', 'Consultation'] },
]
export const professionOf = (id?: string) => PROFESSIONS.find((p) => p.id === id) ?? PROFESSIONS[PROFESSIONS.length - 1]

/* "Professional charges for Cinematography, Editing and Colour grading" */
export function servicesLine(list: string[]): string {
  if (!list.length) return ''
  const s = list.length === 1 ? list[0] : `${list.slice(0, -1).join(', ')} and ${list[list.length - 1]}`
  return `Professional charges for ${s}`
}
