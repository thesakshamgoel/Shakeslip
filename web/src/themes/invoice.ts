/* Invoice designs are a registry: tokens only, one shared layout. Add a design by adding an entry. */
export type InvoiceTheme = { id: string; name: string; blurb: string; vars: Record<string, string>; swatch: [string, string, string] }

const base = { '--p-font': 'var(--font-body)', '--p-head-font': 'var(--font-display)' }

export const invoiceThemes: InvoiceTheme[] = [
  { id: 'classic', name: 'Classic', blurb: 'The Shakeslip original. Navy tables, a warm accent, crisp white paper.', swatch: ['#ffffff', '#0f1b33', '#e0a33a'],
    vars: { ...base, '--p-paper': '#ffffff', '--p-ink': '#141a24', '--p-mute': '#5a6474', '--p-rule': '#1b2333', '--p-soft': '#f6f4ee', '--p-line': '#d9dde4', '--p-head': '#0f1b33', '--p-head-ink': '#ffffff', '--p-accent': '#e0a33a', '--p-title': '#0f1b33', '--p-radius': '2px' } },
  { id: 'onyx', name: 'Onyx', blurb: 'Dark paper with a steel accent. Bold and modern.', swatch: ['#101114', '#8da3c4', '#2a2d34'],
    vars: { ...base, '--p-paper': '#101114', '--p-ink': '#eef0f3', '--p-mute': '#9aa3b2', '--p-rule': '#3a3f49', '--p-soft': '#171a1f', '--p-line': '#262a31', '--p-head': '#1d2129', '--p-head-ink': '#eef0f3', '--p-accent': '#8da3c4', '--p-title': '#8da3c4', '--p-radius': '6px' } },
  { id: 'swiss', name: 'Swiss', blurb: 'Black on white, heavy rules, strict grid.', swatch: ['#ffffff', '#0a0a0a', '#e63323'],
    vars: { ...base, '--p-paper': '#ffffff', '--p-ink': '#0a0a0a', '--p-mute': '#555a63', '--p-rule': '#0a0a0a', '--p-soft': '#f2f2f2', '--p-line': '#cfcfcf', '--p-head': '#0a0a0a', '--p-head-ink': '#ffffff', '--p-accent': '#e63323', '--p-title': '#0a0a0a', '--p-radius': '0px' } },
  { id: 'editorial', name: 'Editorial', blurb: 'Warm ivory, quiet type, heritage ledger feel.', swatch: ['#faf6ee', '#231f1a', '#7a5c2e'],
    vars: { ...base, '--p-paper': '#faf6ee', '--p-ink': '#231f1a', '--p-mute': '#6f6558', '--p-rule': '#8f7f66', '--p-soft': '#f1eadb', '--p-line': '#ded2bd', '--p-head': '#2c261f', '--p-head-ink': '#faf6ee', '--p-accent': '#7a5c2e', '--p-title': '#231f1a', '--p-radius': '2px' } },
  { id: 'blueprint', name: 'Blueprint', blurb: 'Engineer blue on cool white. Precise and technical.', swatch: ['#f5f8fc', '#1d4ed8', '#0b2a6b'],
    vars: { ...base, '--p-paper': '#f5f8fc', '--p-ink': '#0b1b3a', '--p-mute': '#4b5d7a', '--p-rule': '#1d4ed8', '--p-soft': '#e8eef8', '--p-line': '#c7d3e8', '--p-head': '#1d4ed8', '--p-head-ink': '#ffffff', '--p-accent': '#1d4ed8', '--p-title': '#0b2a6b', '--p-radius': '4px' } },
  { id: 'corporate', name: 'Corporate', blurb: 'Executive navy and slate. Calm, serious, enterprise-ready.', swatch: ['#ffffff', '#1e293b', '#64748b'],
    vars: { ...base, '--p-paper': '#ffffff', '--p-ink': '#0f172a', '--p-mute': '#55627a', '--p-rule': '#1e293b', '--p-soft': '#f1f5f9', '--p-line': '#d6dde8', '--p-head': '#1e293b', '--p-head-ink': '#ffffff', '--p-accent': '#64748b', '--p-title': '#1e293b', '--p-radius': '4px' } },
  { id: 'nordic', name: 'Nordic Mint', blurb: 'Sage and emerald on soft white. Fresh and clean.', swatch: ['#fbfdfb', '#1f5f4a', '#8fbf9f'],
    vars: { ...base, '--p-paper': '#fbfdfb', '--p-ink': '#14261f', '--p-mute': '#56695f', '--p-rule': '#1f5f4a', '--p-soft': '#eef6f0', '--p-line': '#cfe2d5', '--p-head': '#1f5f4a', '--p-head-ink': '#ffffff', '--p-accent': '#5fa97c', '--p-title': '#1f5f4a', '--p-radius': '10px' } },
  { id: 'coral', name: 'Sunset Coral', blurb: 'Warm coral on cream. Friendly and creative.', swatch: ['#fffaf6', '#c2410c', '#fb923c'],
    vars: { ...base, '--p-paper': '#fffaf6', '--p-ink': '#2a1a12', '--p-mute': '#7a5a4a', '--p-rule': '#c2410c', '--p-soft': '#fdeee3', '--p-line': '#f2d6c4', '--p-head': '#c2410c', '--p-head-ink': '#ffffff', '--p-accent': '#fb923c', '--p-title': '#9a3412', '--p-radius': '8px' } },
  { id: 'midnight', name: 'Midnight', blurb: 'Deep navy paper with ice-blue accents.', swatch: ['#0b1220', '#7dd3fc', '#1e293b'],
    vars: { ...base, '--p-paper': '#0b1220', '--p-ink': '#e6edf7', '--p-mute': '#93a4bd', '--p-rule': '#334155', '--p-soft': '#111a2c', '--p-line': '#1f2a3d', '--p-head': '#16223a', '--p-head-ink': '#e6edf7', '--p-accent': '#7dd3fc', '--p-title': '#7dd3fc', '--p-radius': '6px' } },
  { id: 'forest', name: 'Forest Night', blurb: 'Dark pine with a soft moss accent.', swatch: ['#0d1712', '#86c39a', '#1a2b22'],
    vars: { ...base, '--p-paper': '#0d1712', '--p-ink': '#e5efe8', '--p-mute': '#93ab9c', '--p-rule': '#2f4639', '--p-soft': '#122019', '--p-line': '#1e3127', '--p-head': '#18291f', '--p-head-ink': '#e5efe8', '--p-accent': '#86c39a', '--p-title': '#86c39a', '--p-radius': '8px' } },
  { id: 'plum', name: 'Plum Dark', blurb: 'Rich plum with a rose-gold accent.', swatch: ['#160f17', '#e8a598', '#2a1c2c'],
    vars: { ...base, '--p-paper': '#160f17', '--p-ink': '#f1e7ef', '--p-mute': '#b29fb0', '--p-rule': '#45324a', '--p-soft': '#1d1420', '--p-line': '#2e2233', '--p-head': '#2a1c2c', '--p-head-ink': '#f1e7ef', '--p-accent': '#e8a598', '--p-title': '#e8a598', '--p-radius': '8px' } },
  { id: 'graphite', name: 'Graphite', blurb: 'Neutral charcoal, white type, one lime accent.', swatch: ['#141414', '#c6f135', '#262626'],
    vars: { ...base, '--p-paper': '#141414', '--p-ink': '#f4f4f4', '--p-mute': '#a3a3a3', '--p-rule': '#3a3a3a', '--p-soft': '#1b1b1b', '--p-line': '#2a2a2a', '--p-head': '#232323', '--p-head-ink': '#f4f4f4', '--p-accent': '#c6f135', '--p-title': '#f4f4f4', '--p-radius': '4px' } },
  { id: 'ocean', name: 'Deep Ocean', blurb: 'Ink-teal paper with an aqua accent.', swatch: ['#071a1d', '#4fd1c5', '#0f2a2e'],
    vars: { ...base, '--p-paper': '#071a1d', '--p-ink': '#e2f3f2', '--p-mute': '#8fb3b1', '--p-rule': '#24474a', '--p-soft': '#0b2226', '--p-line': '#163538', '--p-head': '#0f2a2e', '--p-head-ink': '#e2f3f2', '--p-accent': '#4fd1c5', '--p-title': '#4fd1c5', '--p-radius': '8px' } },
  { id: 'espresso', name: 'Espresso', blurb: 'Warm dark brown with a caramel accent.', swatch: ['#17110d', '#d9a066', '#2a1f18'],
    vars: { ...base, '--p-paper': '#17110d', '--p-ink': '#f3e9df', '--p-mute': '#b5a28f', '--p-rule': '#4a3a2c', '--p-soft': '#1e1611', '--p-line': '#32261d', '--p-head': '#2a1f18', '--p-head-ink': '#f3e9df', '--p-accent': '#d9a066', '--p-title': '#d9a066', '--p-radius': '4px' } },
  { id: 'dusk', name: 'Slate Dusk', blurb: 'Blue-grey dusk with a violet accent.', swatch: ['#13151c', '#a78bfa', '#232633'],
    vars: { ...base, '--p-paper': '#13151c', '--p-ink': '#eceef5', '--p-mute': '#a0a5b8', '--p-rule': '#383c4d', '--p-soft': '#191b24', '--p-line': '#272a37', '--p-head': '#232633', '--p-head-ink': '#eceef5', '--p-accent': '#a78bfa', '--p-title': '#c4b5fd', '--p-radius': '8px' } },
  { id: 'typewriter', name: 'Typewriter', blurb: 'Monospaced and plain, like a well-kept ledger.', swatch: ['#fbfaf7', '#1f1f1f', '#a33b2b'],
    vars: { '--p-font': 'ui-monospace, SFMono-Regular, Menlo, monospace', '--p-head-font': 'ui-monospace, SFMono-Regular, Menlo, monospace', '--p-paper': '#fbfaf7', '--p-ink': '#1f1f1f', '--p-mute': '#5d5a54', '--p-rule': '#1f1f1f', '--p-soft': '#f1efe8', '--p-line': '#d6d2c8', '--p-head': '#1f1f1f', '--p-head-ink': '#fbfaf7', '--p-accent': '#a33b2b', '--p-title': '#1f1f1f', '--p-radius': '0px' } },
]

/* Layouts change the structure; colour sets change the palette. Any layout works with any colours. */
export const LAYOUTS = [
  { id: 'classic', name: 'Classic', blurb: 'The Shakeslip original: details box, filled table header.' },
  { id: 'minimal', name: 'Minimal', blurb: 'Airy, hairline rules, a big total. Nothing filled.' },
  { id: 'band', name: 'Header band', blurb: 'A full-width colour band across the top.' },
  { id: 'compact', name: 'Compact', blurb: 'Dense and efficient for long invoices.' },
  { id: 'bold', name: 'Bold', blurb: 'Large left-aligned title and a heavy rule.' },
  { id: 'ledger', name: 'Ledger', blurb: 'Ruled grid like an accounts book.' },
] as const

export const getInvoiceTheme = (id: string) => invoiceThemes.find((t) => t.id === id) ?? invoiceThemes[0]
