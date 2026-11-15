/* A soft two-note chime made with the Web Audio API, so there is no audio file to ship or license.
   Browsers only allow sound after the person has tapped something on the page; before that it stays silent. */
let ctx: AudioContext | null = null
export function ding() {
  try {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches && localStorage.getItem('ss-sound') !== 'on') return
    if (localStorage.getItem('ss-sound') === 'off') return
    ctx ??= new AudioContext()
    if (ctx.state === 'suspended') void ctx.resume()
    const t0 = ctx.currentTime
    ;[[880, 0], [1318.5, 0.11]].forEach(([f, at]) => {
      const o = ctx!.createOscillator(), g = ctx!.createGain()
      o.type = 'sine'; o.frequency.value = f
      g.gain.setValueAtTime(0.0001, t0 + at); g.gain.exponentialRampToValueAtTime(0.05, t0 + at + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t0 + at + 0.45)
      o.connect(g).connect(ctx!.destination); o.start(t0 + at); o.stop(t0 + at + 0.5)
    })
  } catch { /* no audio available */ }
}
