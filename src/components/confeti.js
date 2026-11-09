// Lluvia de confeti liviana dibujada en un canvas (unos 3 segundos).
export function lanzarConfeti(cv) {
  if (!cv || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  const r = cv.getBoundingClientRect()
  const d = Math.min(window.devicePixelRatio || 1, 2)
  cv.width = r.width * d
  cv.height = r.height * d
  const x = cv.getContext('2d')
  x.scale(d, d)
  const colores = ['#e2559f', '#f490c0', '#f08a2c', '#ffd29e', '#d9962f', '#ffffff']
  const piezas = Array.from({ length: 110 }, (_, i) => ({
    x: r.width / 2, y: 120,
    vx: (Math.random() - 0.5) * 9, vy: -Math.random() * 9 - 3,
    s: 4 + Math.random() * 5, c: colores[i % colores.length],
    a: Math.random() * 6, va: (Math.random() - 0.5) * 0.3, f: Math.random() < 0.5,
  }))
  const t0 = performance.now()
  const cuadro = (t) => {
    const e = t - t0
    x.clearRect(0, 0, r.width, r.height)
    for (const p of piezas) {
      p.vy += 0.22; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.a += p.va
      x.save()
      x.globalAlpha = Math.max(0, 1 - e / 3200)
      x.translate(p.x, p.y); x.rotate(p.a); x.fillStyle = p.c
      if (p.f) x.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2)
      else { x.beginPath(); x.arc(0, 0, p.s / 2.4, 0, 6.3); x.fill() }
      x.restore()
    }
    if (e < 3200) requestAnimationFrame(cuadro)
    else x.clearRect(0, 0, r.width, r.height)
  }
  requestAnimationFrame(cuadro)
}
