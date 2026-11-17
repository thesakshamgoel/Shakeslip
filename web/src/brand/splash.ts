/* Loader logic, ported from the existing app. Waits for load, fonts and a minimum
   spin time, settles the mark upright (the star is 90-degree symmetric) so the star
   reveal lines up, then opens the star window onto the app. */
export function mountSplash(): void {
  const host = document.getElementById('splash-root')
  if (!host) return
  /* the loader is already on screen from index.html; reuse it so the spin carries on without a restart */
  if (!document.getElementById('splash')) host.innerHTML =
    '<div id="splash" role="status" aria-label="Loading Shakeslip"><div class="splash-zoom"><div class="splash-mark"></div></div></div>'
  const s = document.getElementById('splash') as HTMLElement
  const sp = s.querySelector('.splash-mark') as HTMLElement

  const loaded = new Promise<void>((r) => {
    if (document.readyState === 'complete') r()
    else window.addEventListener('load', () => r())
  })
  const fonts = document.fonts
    ? Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 2500))])
    : Promise.resolve()
  const minWait = new Promise((r) => setTimeout(r, Math.max(0, 1500 - performance.now())))

  void Promise.all([loaded, fonts, minWait]).then(() => {
    const simple = !(window.CSS && 'registerProperty' in CSS)
    let wait = 0
    if (simple) s.classList.add('simple')
    else {
      const m = getComputedStyle(sp).transform
      const v = m && /matrix\(([^)]+)\)/.exec(m)
      let ang = 0
      if (v) {
        const p = v[1].split(',')
        ang = (Math.atan2(parseFloat(p[1]), parseFloat(p[0])) * 180) / Math.PI
        if (ang < 0) ang += 360
      }
      sp.classList.add('stop')
      sp.style.transform = `rotate(${ang}deg)`
      void sp.offsetWidth
      sp.style.transition = 'transform .5s cubic-bezier(.25,.8,.25,1)'
      sp.style.transform = `rotate(${Math.ceil((ang + 25) / 90) * 90}deg)`
      wait = 520
    }
    setTimeout(() => {
      s.classList.add('out')
      /* the welcome greeting waits for this, so it never plays underneath the loader */
      window.dispatchEvent(new Event('ss-splash-open'))
      document.body.classList.add('app-enter')
      setTimeout(() => document.body.classList.remove('app-enter'), 2000)
      setTimeout(() => host.replaceChildren(), 2300)
    }, wait)
  })
}
