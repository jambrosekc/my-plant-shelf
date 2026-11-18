import { useEffect, useRef, useState } from 'react'

export type BgMode = 'both' | 'leaves' | 'lights' | 'off'
export const BG_ORDER: BgMode[] = ['both', 'leaves', 'lights', 'off']
export const BG_LABEL: Record<BgMode, string> = { both: 'Leaves and lights', leaves: 'Falling leaves', lights: 'Glowing lights', off: 'Off' }

interface Leaf { x: number; y: number; s: number; vy: number; sway: number; ph: number; rot: number; vr: number; c: number; a: number }
interface Light { x: number; y: number; r: number; vy: number; vx: number; ph: number; sp: number; a: number }

const GREENS_LIGHT = ['#6f9a6a', '#7c9a62', '#5f8260', '#9cb878', '#4e7d63', '#b3c97a']
const GREENS_DARK = ['#6aa67c', '#8fb59a', '#7fa070', '#a9cbb3', '#5f9a78', '#b6d28a']

function drawLeaf(ctx: CanvasRenderingContext2D, l: Leaf, color: string) {
  ctx.save()
  ctx.translate(l.x, l.y)
  ctx.rotate(l.rot)
  ctx.globalAlpha = l.a
  ctx.fillStyle = color
  const s = l.s
  ctx.beginPath()
  ctx.moveTo(0, -s)
  ctx.bezierCurveTo(s * 0.75, -s * 0.45, s * 0.6, s * 0.55, 0, s)
  ctx.bezierCurveTo(-s * 0.6, s * 0.55, -s * 0.75, -s * 0.45, 0, -s)
  ctx.fill()
  ctx.strokeStyle = 'rgba(255,255,255,.35)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(0, -s * 0.8)
  ctx.lineTo(0, s * 0.9)
  ctx.stroke()
  ctx.restore()
}

export default function Particles({ mode }: { mode: BgMode; theme?: string }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const read = () => document.documentElement.getAttribute('data-theme') || 'light'
  const [theme, setTheme] = useState(read)
  useEffect(() => {
    const o = new MutationObserver(() => setTheme(read()))
    o.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => o.disconnect()
  }, [])

  useEffect(() => {
    const cv = ref.current
    if (!cv || mode === 'off') return
    const ctx = cv.getContext('2d')!
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    let w = 0, h = 0, raf = 0, last = 0, running = true
    const dark = theme === 'dark'
    const greens = dark ? GREENS_DARK : GREENS_LIGHT
    const wantLeaves = mode === 'leaves' || mode === 'both'
    const wantLights = mode === 'lights' || mode === 'both'
    let leaves: Leaf[] = []
    let lights: Light[] = []

    const rnd = (a: number, b: number) => a + Math.random() * (b - a)
    const mkLeaf = (anywhere: boolean): Leaf => ({
      x: rnd(0, w), y: anywhere ? rnd(0, h) : rnd(-60, -10), s: rnd(7, 15), vy: rnd(14, 32), sway: rnd(14, 38),
      ph: rnd(0, 6.28), rot: rnd(0, 6.28), vr: rnd(-0.6, 0.6), c: Math.floor(rnd(0, greens.length)), a: rnd(0.35, 0.7),
    })
    const mkLight = (): Light => ({
      x: rnd(0, w), y: rnd(0, h), r: rnd(2, 5.5), vy: rnd(-9, -3), vx: rnd(-4, 4), ph: rnd(0, 6.28), sp: rnd(0.6, 1.6), a: rnd(0.5, 1),
    })

    function resize() {
      w = window.innerWidth
      h = window.innerHeight
      cv!.width = Math.round(w * dpr)
      cv!.height = Math.round(h * dpr)
      cv!.style.width = w + 'px'
      cv!.style.height = h + 'px'
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      const k = Math.min(1, (w * h) / (390 * 800)) // fewer on small screens
      leaves = wantLeaves ? Array.from({ length: Math.round(26 * Math.max(0.7, k)) }, () => mkLeaf(true)) : []
      lights = wantLights ? Array.from({ length: Math.round(34 * Math.max(0.7, k)) }, mkLight) : []
    }

    function frame(t: number) {
      if (!running) return
      const dt = Math.min(0.05, (t - last) / 1000 || 0.016)
      last = t
      ctx.clearRect(0, 0, w, h)
      for (const l of lights) {
        l.y += l.vy * dt
        l.x += (l.vx + Math.sin(t / 1800 + l.ph) * 6) * dt
        if (l.y < -10) { l.y = h + 10; l.x = rnd(0, w) }
        const tw = 0.55 + 0.45 * Math.sin(t / 1000 * l.sp + l.ph)
        const R = l.r * 5
        const g = ctx.createRadialGradient(l.x, l.y, 0, l.x, l.y, R)
        const core = dark ? '255,231,160' : '232,170,60'
        g.addColorStop(0, `rgba(${core},${(dark ? 0.9 : 0.75) * tw * l.a})`)
        g.addColorStop(0.25, `rgba(${core},${(dark ? 0.35 : 0.3) * tw * l.a})`)
        g.addColorStop(1, `rgba(${core},0)`)
        ctx.fillStyle = g
        ctx.beginPath()
        ctx.arc(l.x, l.y, R, 0, 6.283)
        ctx.fill()
      }
      for (const l of leaves) {
        l.y += l.vy * dt
        l.x += Math.sin(t / 1500 + l.ph) * l.sway * dt
        l.rot += l.vr * dt
        if (l.y > h + 20) Object.assign(l, mkLeaf(false))
        drawLeaf(ctx, l, greens[l.c])
      }
      raf = requestAnimationFrame(frame)
    }

    function onVis() {
      if (document.hidden) { running = false; cancelAnimationFrame(raf) }
      else if (!running) { running = true; last = performance.now(); raf = requestAnimationFrame(frame) }
    }

    resize()
    window.addEventListener('resize', resize)
    document.addEventListener('visibilitychange', onVis)
    raf = requestAnimationFrame(frame)
    return () => {
      running = false
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      document.removeEventListener('visibilitychange', onVis)
      ctx.clearRect(0, 0, cv.width, cv.height)
    }
  }, [mode, theme])

  if (mode === 'off') return null
  return <canvas ref={ref} className="pcanvas" aria-hidden="true" />
}
