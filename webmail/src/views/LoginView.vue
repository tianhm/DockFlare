<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { useAuth } from '../composables/useAuth'
import { useMailStore } from '../stores/mail'
import { authApi } from '../api/auth'
import { Sun, Moon } from 'lucide-vue-next'

const route = useRoute()
const { login } = useAuth()
const store = useMailStore()

const email = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)
const canvasRef = ref<HTMLCanvasElement | null>(null)

const taglineText = ref('Manage OAuth/OIDC providers directly in DockFlare.')
const taglineVisible = ref(true)

let animFrameId = 0
const taglineTimers: ReturnType<typeof setTimeout>[] = []

const getMasterUrl = async (): Promise<string> => {
  let url = import.meta.env.VITE_MASTER_URL as string
  if (!url) {
    try {
      const cfg = await fetch('/config.json').then(r => r.json())
      url = cfg.masterUrl
    } catch {}
  }
  return url || window.location.origin.replace('mail.', '')
}

const handleLogin = async () => {
  error.value = ''
  loading.value = true
  try {
    const data = await authApi.loginWithPassword(email.value, password.value)
    if (data.success && data.token) {
      login(data.token)
    } else {
      error.value = data.error || 'Invalid email or password'
    }
  } catch {
    error.value = 'Connection error. Please try again.'
  } finally {
    loading.value = false
  }
}

const redirectToMaster = async () => {
  const masterUrl = await getMasterUrl()
  window.location.href = `${masterUrl}/email/sso/callback?return_to=${window.location.hostname}`
}

function startTagline() {
  const lines = [
    'Manage OAuth/OIDC providers directly in DockFlare.',
    'Zone Default Policies protect all subdomains automatically.',
    'Security-audited with CSRF, XSS, and injection protection.',
    'Deploy agents across your multi-server infrastructure.',
    "Now you're thinking with Zero Trust security.",
  ]
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
  let idx = 0
  const DISPLAY_MS = 5500
  const FADE_MS = 2800
  function cycle() {
    taglineVisible.value = false
    const t1 = setTimeout(() => {
      idx = (idx + 1) % lines.length
      taglineText.value = lines[idx]
      taglineVisible.value = true
      const t2 = setTimeout(cycle, DISPLAY_MS)
      taglineTimers.push(t2)
    }, FADE_MS)
    taglineTimers.push(t1)
  }
  const t0 = setTimeout(cycle, DISPLAY_MS)
  taglineTimers.push(t0)
}

function startCanvas() {
  const canvas = canvasRef.value
  if (!canvas) return
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

  const ctx = canvas.getContext('2d')!
  let W = 0, H = 0
  const events: PortalEvent[] = []

  function isDark() {
    return document.documentElement.classList.contains('dark')
  }

  function resize() {
    W = canvas!.width  = canvas!.parentElement!.clientWidth
    H = canvas!.height = canvas!.parentElement!.clientHeight
  }
  window.addEventListener('resize', resize)
  resize()

  const dockerWhite = new Image()
  dockerWhite.src = '/envelope-white.svg'
  const dockerBlue = new Image()
  dockerBlue.src = '/envelope-blue.svg'

  function easeIn5(t: number)  { return t * t * t * t * t }
  function easeOut5(t: number) { return 1 - Math.pow(1 - t, 5) }

  const RX = 11, RY = 27
  const LOGO_R = 165

  function safePt(pad: number) {
    const cx = W / 2, cy = H / 2
    let x: number, y: number
    do {
      x = pad + Math.random() * (W - pad * 2)
      y = pad + Math.random() * (H - pad * 2)
    } while ((x - cx) ** 2 + (y - cy) ** 2 < LOGO_R * LOGO_R)
    return { x, y }
  }

  class PortalEvent {
    sx: number; sy: number; ex: number; ey: number
    aIn: number; aOut: number
    phase = 0; timer = 0
    bScale = 0; oScale = 0; prog = 0
    OPEN_MS     = 533
    READY_MS    = 750
    TRAVEL_MS   = 1000
    TRANSIT_MS  = 300
    PRECLOSE_MS = 667
    CLOSE_MS    = 467
    isDead = false

    constructor() {
      const pad = 100
      const s = safePt(pad), e = safePt(pad)
      this.sx = s.x; this.sy = s.y
      this.ex = e.x; this.ey = e.y
      this.aIn  = Math.PI * (0.3 + Math.random() * 0.4)
      this.aOut = Math.PI * (0.3 + Math.random() * 0.4)
    }

    update(delta: number) {
      this.timer += delta
      switch (this.phase) {
        case 0:
          this.bScale = Math.min(1, this.timer / this.OPEN_MS)
          if (this.bScale === 1) { this.phase = 1; this.timer = 0 }
          break
        case 1:
          this.oScale = Math.min(1, this.timer / this.OPEN_MS)
          if (this.oScale === 1) { this.phase = 2; this.timer = 0 }
          break
        case 2:
          if (this.timer >= this.READY_MS) { this.phase = 3; this.timer = 0 }
          break
        case 3:
          this.prog = Math.min(1, this.timer / this.TRAVEL_MS)
          if (this.prog === 1) { this.phase = 4; this.timer = 0 }
          break
        case 4:
          if (this.timer >= this.TRANSIT_MS) { this.phase = 5; this.timer = 0 }
          break
        case 5:
          this.prog = Math.min(1, this.timer / this.TRAVEL_MS)
          if (this.prog === 1) { this.phase = 6; this.timer = 0 }
          break
        case 6:
          if (this.timer >= this.PRECLOSE_MS) { this.phase = 7; this.timer = 0 }
          break
        case 7: {
          const t6 = this.timer / this.CLOSE_MS
          this.bScale = Math.max(0, 1 - t6)
          this.oScale = Math.max(0, 1 - t6)
          if (this.bScale === 0) this.isDead = true
          break
        }
      }
    }

    readyPulse() {
      if (this.phase !== 2) return 1
      return 1 + 0.18 * Math.sin((this.timer / this.READY_MS) * Math.PI)
    }

    drawPortal(x: number, y: number, angle: number, scale: number, type: 'blue' | 'orange', pulse: number) {
      if (scale <= 0) return
      ctx.save()
      ctx.translate(x, y)
      ctx.rotate(angle + Math.PI / 2)
      ctx.scale(1, scale)

      const ga = (type === 'blue' ? 0.22 : 0.20) * pulse
      const grd = ctx.createRadialGradient(0, 0, 0, 0, 0, RY)
      if (type === 'blue') {
        grd.addColorStop(0, `rgba(59,130,246,${ga})`)
        grd.addColorStop(1, 'rgba(59,130,246,0)')
      } else {
        grd.addColorStop(0, `rgba(249,115,22,${ga})`)
        grd.addColorStop(1, 'rgba(249,115,22,0)')
      }
      ctx.fillStyle = grd
      ctx.beginPath()
      ctx.ellipse(0, 0, RX, RY, 0, 0, Math.PI * 2)
      ctx.fill()

      const a = Math.min(1, (isDark() ? 0.70 : 0.75) * pulse)
      const glowColor = type === 'blue' ? '96,165,250' : '249,115,22'
      ctx.lineWidth = 2.5
      ctx.shadowBlur  = 18
      ctx.shadowColor = `rgba(${glowColor},${a * 0.9})`
      ctx.beginPath()
      ctx.ellipse(0, 0, RX, RY, 0, 0, Math.PI * 2)
      ctx.strokeStyle = `rgba(${glowColor},${a})`
      ctx.stroke()
      ctx.shadowBlur = 0
      ctx.restore()
    }

    drawContainer(px: number, py: number, angle: number, alpha: number) {
      const img = isDark() ? dockerBlue : dockerWhite
      if (!img.complete || !img.naturalWidth) return
      const SIZE = 40
      ctx.save()
      ctx.globalAlpha = Math.max(0, Math.min(1, alpha))
      ctx.translate(px, py)
      ctx.rotate(angle)
      ctx.shadowColor = isDark() ? 'rgba(36,150,237,0.45)' : 'rgba(36,150,237,0.55)'
      ctx.shadowBlur  = 10
      ctx.drawImage(img, -SIZE / 2, -SIZE / 2, SIZE, SIZE)
      ctx.restore()
    }

    wiggle(x: number, y: number, angle: number, prog: number, entering: boolean) {
      const AMP = 5, FREQ = 2.0
      let fade: number
      if (entering) {
        const rampUp   = Math.min(1, prog / 0.20)
        const rampDown = Math.min(1, (1 - prog) / 0.28)
        fade = rampUp * rampDown
      } else {
        fade = Math.min(1, prog / 0.25)
      }
      const wave  = Math.sin(prog * FREQ * Math.PI * 2)
      const dwave = Math.cos(prog * FREQ * Math.PI * 2)
      const offset = AMP * wave * fade
      const tilt   = 0.30 * dwave * fade
      const perp   = angle + Math.PI / 2
      return { wx: x + Math.cos(perp) * offset, wy: y + Math.sin(perp) * offset, tilt }
    }

    draw() {
      const pulse = this.readyPulse()
      this.drawPortal(this.sx, this.sy, this.aIn,  this.bScale, 'blue',   pulse)
      if (this.phase >= 1)
        this.drawPortal(this.ex, this.ey, this.aOut, this.oScale, 'orange', pulse)

      if (this.phase === 3) {
        const dist3   = 145 * (1 - easeIn5(this.prog))
        const alpha3  = this.prog < 0.15 ? this.prog / 0.15 : 1 - Math.max(0, (this.prog - 0.78) / 0.22)
        const tAngle3 = this.aIn + Math.PI / 2
        const w3 = this.wiggle(this.sx + Math.sin(this.aIn) * dist3, this.sy - Math.cos(this.aIn) * dist3, tAngle3, this.prog, true)
        this.drawContainer(w3.wx, w3.wy, tAngle3 + w3.tilt + Math.PI, alpha3)
      }
      if (this.phase === 5) {
        const dist5   = 145 * easeOut5(this.prog)
        const alpha5  = this.prog < 0.12 ? this.prog / 0.12 : 1 - Math.max(0, (this.prog - 0.80) / 0.20)
        const tAngle5 = this.aOut + Math.PI / 2
        const w5 = this.wiggle(this.ex - Math.sin(this.aOut) * dist5, this.ey + Math.cos(this.aOut) * dist5, tAngle5, this.prog, false)
        this.drawContainer(w5.wx, w5.wy, tAngle5 + w5.tilt + Math.PI, alpha5)
      }
    }
  }

  let nextSpawn = 0
  const SPAWN_PAUSE_MS = 3500
  let lastTime = 0

  function animate(now: number) {
    const delta = lastTime ? Math.min(now - lastTime, 50) : 16.67
    lastTime = now

    ctx.fillStyle = isDark() ? 'rgba(238,242,255,0.32)' : 'rgba(13,13,26,0.32)'
    ctx.fillRect(0, 0, W, H)

    for (let i = events.length - 1; i >= 0; i--) {
      events[i].update(delta)
      events[i].draw()
      if (events[i].isDead) {
        events.splice(i, 1)
        nextSpawn = now + SPAWN_PAUSE_MS
      }
    }
    if (events.length < 1 && now >= nextSpawn) {
      events.push(new PortalEvent())
      nextSpawn = Infinity
    }
    animFrameId = requestAnimationFrame(animate)
  }

  animFrameId = requestAnimationFrame(animate)
}

onMounted(() => {
  const token = route.query.token as string
  if (token) { login(token) }
  startTagline()
  startCanvas()
})

onUnmounted(() => {
  if (animFrameId) cancelAnimationFrame(animFrameId)
  taglineTimers.forEach(clearTimeout)
})
</script>

<template>
  <div class="df-login-root">

    <button
      type="button"
      class="df-theme-btn"
      :title="store.isDark ? 'Switch to light mode' : 'Switch to dark mode'"
      @click="store.toggleTheme()"
    >
      <Sun v-if="store.isDark" class="size-5" />
      <Moon v-else class="size-5" />
    </button>

    <div class="df-panel-left" aria-hidden="true">
      <div class="df-aurora">
        <div class="df-aurora-blob"></div>
        <div class="df-aurora-blob"></div>
        <div class="df-aurora-blob"></div>
      </div>
      <canvas ref="canvasRef" class="df-portal-canvas"></canvas>
      <div class="df-panel-left-content">
        <img
          :src="store.isDark ? '/logo-light.svg' : '/logo-dark.svg'"
          alt=""
          class="df-portal-logo-center"
        />
        <div class="df-tagline" :class="{ 'df-tagline-hidden': !taglineVisible }">
          {{ taglineText }}
        </div>
      </div>
    </div>

    <div class="df-panel-right">
      <div class="df-form-container">

        <img
          :src="store.isDark ? '/logo-dark.svg' : '/logo-light.svg'"
          alt="DockFlare"
          class="df-mobile-logo"
        />

        <h1 class="df-form-heading">Sign in</h1>
        <p class="df-form-sub">DockFlare Mail</p>

        <form @submit.prevent="handleLogin" class="df-form-fields">
          <input
            v-model="email"
            type="email"
            placeholder="you@example.com"
            required
            class="df-input"
          />
          <input
            v-model="password"
            type="password"
            placeholder="Password"
            required
            class="df-input"
          />
          <p v-if="error" class="df-error">{{ error }}</p>
          <button
            type="submit"
            class="df-btn-primary"
            :disabled="loading"
          >
            {{ loading ? 'Signing in…' : 'Sign in' }}
          </button>
        </form>

        <div class="df-or">or</div>

        <button class="df-btn-outline" @click="redirectToMaster">
          <span class="df-btn-outline-label">Admin SSO</span>
        </button>

      </div>
    </div>

  </div>
</template>

<style>
.df-login-root {
  display: flex;
  min-height: 100vh;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

.df-panel-left {
  display: none;
  position: relative;
  width: 50%;
  min-height: 100vh;
  background: #0d0d1a;
  overflow: hidden;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  transition: background 0.3s;
}
@media (min-width: 768px) { .df-panel-left { display: flex; } }
.dark .df-panel-left { background: #eef2ff; }

.df-aurora {
  position: absolute; inset: 0; z-index: 1;
  pointer-events: none; overflow: hidden;
  mix-blend-mode: screen;
}
.dark .df-aurora { mix-blend-mode: multiply; }

.df-aurora-blob {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  animation: auroradrift 18s ease-in-out infinite alternate;
}
.df-aurora-blob:nth-child(1) {
  width: 60%; height: 60%;
  top: -12%; left: -12%;
  background: radial-gradient(circle, rgba(99,102,241,0.18), transparent 70%);
  animation-duration: 20s;
}
.df-aurora-blob:nth-child(2) {
  width: 55%; height: 55%;
  bottom: -10%; right: -10%;
  background: radial-gradient(circle, rgba(249,115,22,0.14), transparent 70%);
  animation-duration: 24s;
  animation-delay: -8s;
}
.df-aurora-blob:nth-child(3) {
  width: 45%; height: 45%;
  top: 30%; left: 28%;
  background: radial-gradient(circle, rgba(59,130,246,0.12), transparent 70%);
  animation-duration: 30s;
  animation-delay: -14s;
}
.dark .df-aurora-blob:nth-child(1) {
  background: radial-gradient(circle, rgba(99,102,241,0.14), transparent 70%);
}
.dark .df-aurora-blob:nth-child(2) {
  background: radial-gradient(circle, rgba(249,115,22,0.12), transparent 70%);
}
.dark .df-aurora-blob:nth-child(3) {
  background: radial-gradient(circle, rgba(59,130,246,0.10), transparent 70%);
}
@keyframes auroradrift {
  0%   { transform: translate(0, 0) scale(1); }
  33%  { transform: translate(6%, -8%) scale(1.08); }
  66%  { transform: translate(-5%, 6%) scale(0.95); }
  100% { transform: translate(4%, 5%) scale(1.05); }
}

.df-portal-canvas {
  position: absolute; inset: 0;
  width: 100%; height: 100%;
  z-index: 0;
}

.df-panel-left-content {
  position: relative; z-index: 2;
  display: flex; flex-direction: column;
  align-items: center;
  pointer-events: none;
  width: 100%;
  height: 100%;
  justify-content: center;
}

.df-portal-logo-center {
  width: 230px;
  filter: drop-shadow(0 0 18px rgba(99,102,241,0.45));
}
.dark .df-portal-logo-center { filter: none; }

.df-tagline {
  position: absolute;
  bottom: 2.5rem;
  left: 0; right: 0;
  text-align: center;
  color: rgba(255,255,255,0.55);
  font-size: 0.875rem;
  line-height: 1.65;
  padding: 0 2rem;
  opacity: 1;
  transition: opacity 2.8s ease;
}
.df-tagline-hidden { opacity: 0; }
.dark .df-tagline { color: #4338ca; }

.df-panel-right {
  flex: 1;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem 1.5rem;
  background: radial-gradient(ellipse at 55% 45%, #f0eeff 0%, #f8f8ff 45%, #ffffff 100%);
  transition: background 0.2s;
}
.dark .df-panel-right {
  background: radial-gradient(ellipse at 55% 45%, #1a1033 0%, #141020 40%, #111827 100%);
}

.df-form-container {
  width: 100%; max-width: 380px;
  background: linear-gradient(to bottom, #ffffff 0%, #f7f8ff 100%);
  border: 1px solid #cbd5e1;
  border-radius: 1rem;
  padding: 2.25rem 2rem;
  box-shadow:
    inset 0 1px 0 rgba(255,255,255,1),
    0 8px 24px rgba(0,0,0,0.10),
    0 2px 8px rgba(99,102,241,0.07);
}
.dark .df-form-container {
  background: linear-gradient(160deg, rgba(255,255,255,0.04) 0%, transparent 35%), #1e2433;
  border-color: #2d3748;
  box-shadow:
    inset 0 1px 0 rgba(255,255,255,0.07),
    0 4px 6px -1px rgba(0,0,0,0.30),
    0 2px 4px -2px rgba(0,0,0,0.20);
}

.df-mobile-logo {
  display: block;
  margin: 0 auto 2rem;
  height: 46px;
}
@media (min-width: 768px) { .df-mobile-logo { display: none; } }

.df-form-heading {
  font-size: 1.5rem; font-weight: 700;
  color: #111827; margin: 0 0 0.3rem;
  letter-spacing: -0.02em;
}
.dark .df-form-heading { color: #f9fafb; }

.df-form-sub { font-size: 0.875rem; color: #6b7280; margin: 0 0 1.75rem; }
.dark .df-form-sub { color: #9ca3af; }

.df-form-fields { display: flex; flex-direction: column; }

.df-input {
  width: 100%; padding: 0.65rem 0.875rem;
  border-radius: 0.5rem; border: 1.5px solid #e5e7eb;
  background: #fff; color: #111827;
  font-size: 0.9375rem; font-family: inherit;
  outline: none;
  transition: border-color 0.15s, box-shadow 0.15s;
  margin-bottom: 0.75rem;
}
.df-input:focus { border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99,102,241,0.12); }
.dark .df-input { background: #1f2937; border-color: #374151; color: #f9fafb; }
.dark .df-input:focus { border-color: #818cf8; box-shadow: 0 0 0 3px rgba(129,140,248,0.14); }
.df-input::placeholder { color: #9ca3af; }

.df-error {
  font-size: 0.875rem;
  color: #dc2626;
  margin: -0.25rem 0 0.5rem;
}
.dark .df-error { color: #f87171; }

.df-btn-primary {
  width: 100%; display: block; padding: 0.7rem 1rem;
  border-radius: 0.5rem;
  background: linear-gradient(135deg, #6366f1 0%, #4f46e5 50%, #7c3aed 100%);
  color: #fff;
  font-size: 0.9375rem; font-weight: 600; font-family: inherit;
  border: none; cursor: pointer;
  box-shadow: 0 2px 8px rgba(99,102,241,0.35);
  transition: opacity 0.15s, transform 0.1s, box-shadow 0.15s;
}
.df-btn-primary:hover:not(:disabled) { opacity: 0.92; box-shadow: 0 4px 14px rgba(99,102,241,0.45); }
.df-btn-primary:active:not(:disabled) { transform: scale(0.99); }
.df-btn-primary:disabled { opacity: 0.55; cursor: not-allowed; }

.df-or {
  display: flex; align-items: center; gap: 0.75rem;
  margin: 1.25rem 0; color: #9ca3af;
  font-size: 0.75rem; letter-spacing: 0.06em; text-transform: uppercase;
}
.df-or::before, .df-or::after { content: ''; flex: 1; height: 1px; background: #e5e7eb; }
.dark .df-or::before,
.dark .df-or::after { background: #374151; }

.df-btn-outline {
  width: 100%; display: flex; align-items: center; gap: 0.75rem;
  padding: 0.65rem 1rem; border-radius: 0.5rem;
  background: transparent; color: #374151;
  font-size: 0.9375rem; font-weight: 500; font-family: inherit;
  border: 1.5px solid #e5e7eb; cursor: pointer;
  transition: background 0.12s, border-color 0.12s;
}
.df-btn-outline:hover { background: #f9fafb; border-color: #d1d5db; }
.dark .df-btn-outline { color: #f3f4f6; border-color: #374151; }
.dark .df-btn-outline:hover { background: #1f2937; border-color: #4b5563; }
.df-btn-outline-label { flex: 1; text-align: center; }

.df-theme-btn {
  position: fixed; top: 1rem; right: 1rem; z-index: 50;
  width: 2.25rem; height: 2.25rem; border-radius: 9999px;
  display: flex; align-items: center; justify-content: center;
  background: rgba(255,255,255,0.82); border: 1px solid rgba(0,0,0,0.08);
  color: #374151; box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  cursor: pointer; transition: background 0.2s;
}
.df-theme-btn:hover { background: rgba(255,255,255,0.96); }
.dark .df-theme-btn {
  background: rgba(31,41,55,0.90); border-color: rgba(255,255,255,0.10);
  color: #d1d5db; box-shadow: 0 2px 8px rgba(0,0,0,0.35);
}
.dark .df-theme-btn:hover { background: rgba(55,65,81,0.95); }
</style>
