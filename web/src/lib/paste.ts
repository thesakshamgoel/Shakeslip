/* Pasted text becomes one entry per line, and a very long line is cut at a word break, never in the middle of a word and never silently. */
export function splitPaste(text: string, max = 600): string[] {
  const out: string[] = []
  for (const raw of text.replace(/\r/g, '').split('\n')) {
    let s = raw.replace(/\t/g, ' ').trim()
    while (s.length > max) {
      const at = s.lastIndexOf(' ', max)
      const cut = at > max * 0.5 ? at : max
      out.push(s.slice(0, cut).trim()); s = s.slice(cut).trim()
    }
    if (s) out.push(s)
  }
  return out
}
