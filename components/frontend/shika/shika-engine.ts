/* ════════════════════════════════════════════════════════════════
   Shika synthetic price engine — ported verbatim from the ShikaTrade
   chart project (index.php). A spike-pattern generator: a base level
   with constant micro-jitter, frequent spike clusters, small red dips
   and occasional deep crashes with floor bounces.

   The engine is fully client-side and deterministic only in shape —
   randomness drives the mode transitions. Trade outcomes are NOT
   decided here; they come from trading-nova's /api/trade backend.
   ════════════════════════════════════════════════════════════════ */

export interface ShikaConfig {
  TICK: number
  MAX_PTS: number
  Y_MAX: number
  SPIKE_FREQ: number
  CRASH_FREQ: number
  BASE_LEVEL: number
  SPIKE_MAX: number
  CRASH_DEPTH: number
  /** derived: BASE_LEVEL / 0.025 — scales all hardcoded engine magnitudes */
  SCALE: number
}

export const DEFAULT_CONFIG: ShikaConfig = {
  TICK: 350,
  MAX_PTS: 80,
  Y_MAX: 0.12,
  SPIKE_FREQ: 0.08,
  CRASH_FREQ: 0.01,
  BASE_LEVEL: 0.025,
  SPIKE_MAX: 0.105,
  CRASH_DEPTH: -0.17,
  SCALE: 1,
}

type EngineMode = 'active' | 'dip' | 'crash' | 'crash_floor' | 'recover'

interface EngineState {
  mode: EngineMode
  tick: number
  base: number
  clusterLeft: number
  lastSpikeH: number
  crashFloor: number
  crashTicks: number
  crashBounces: number
  dipTarget: number
  dipLen: number
  wobblePhase: number
  wobbleSpeed: number
}

/**
 * A self-contained price generator. Create one per chart instance.
 * Call `next()` each tick to advance the rate; read `rate` / `prevRate`
 * / `high24` / `low24` for the current state.
 */
export class ShikaEngine {
  cfg: ShikaConfig
  rate = 0.015
  prevRate = 0.015
  high24 = 0.098
  low24 = -0.12
  private eng: EngineState

  constructor(cfg: Partial<ShikaConfig> = {}) {
    this.cfg = { ...DEFAULT_CONFIG, ...cfg }
    this.cfg.SCALE = this.cfg.BASE_LEVEL / 0.025
    this.eng = {
      mode: 'active',
      tick: 0,
      base: 0.012,
      clusterLeft: 0,
      lastSpikeH: 0,
      crashFloor: 0,
      crashTicks: 0,
      crashBounces: 0,
      dipTarget: 0,
      dipLen: 0,
      wobblePhase: Math.random() * 100,
      wobbleSpeed: 0.15 + Math.random() * 0.1,
    }
  }

  /** Apply backend-supplied config and reset engine state to the new scale. */
  applyConfig(cfg: Partial<ShikaConfig>) {
    this.cfg = { ...this.cfg, ...cfg }
    this.cfg.SCALE = this.cfg.BASE_LEVEL / 0.025
    this.eng.base = this.cfg.BASE_LEVEL * 0.5
    this.rate = this.cfg.BASE_LEVEL * 0.6
  }

  /** Spike height with an amplified distribution — taller, more dramatic spikes. */
  private generateSpikeHeight(): number {
    const M = this.cfg.SPIKE_MAX
    const r = Math.random()
    if (r < 0.15) return M * (0.2 + Math.random() * 0.18)
    if (r < 0.35) return M * (0.35 + Math.random() * 0.22)
    if (r < 0.55) return M * (0.5 + Math.random() * 0.25)
    if (r < 0.75) return M * (0.7 + Math.random() * 0.2)
    if (r < 0.9) return M * (0.85 + Math.random() * 0.15)
    return M * (0.95 + Math.random() * 0.1)
  }

  /** Advance the engine one tick and return the new rate. */
  next(): number {
    const eng = this.eng
    const CFG = this.cfg
    eng.tick++
    let p = this.rate

    switch (eng.mode) {
      case 'active': {
        const S = CFG.SCALE

        // ── DIP & CRASH CHECK — fires first, independent of spikes ──
        if (eng.tick > 2 && Math.random() < 0.2) {
          eng.mode = 'dip'
          eng.tick = 0
          eng.clusterLeft = 0
          eng.lastSpikeH = 0
          const dipScale = CFG.SPIKE_MAX || 0.105
          eng.dipTarget = -(0.08 + Math.random() * 0.35) * dipScale
          eng.dipLen = 3 + Math.floor(Math.random() * 6)
          p = eng.dipTarget
          break
        }
        if (eng.tick > 12 && Math.random() < CFG.CRASH_FREQ * 2.0) {
          eng.crashFloor = CFG.CRASH_DEPTH + Math.random() * 0.04 * S
          eng.mode = 'crash'
          eng.tick = 0
          eng.clusterLeft = 0
          eng.lastSpikeH = 0
          eng.crashBounces = 0
          break
        }

        // ── CONSTANT BASE JITTER ──
        eng.wobblePhase += eng.wobbleSpeed
        const wobble =
          Math.sin(eng.wobblePhase) * 0.004 * S +
          Math.sin(eng.wobblePhase * 2.3) * 0.002 * S +
          (Math.random() - 0.5) * 0.005 * S

        eng.base += (Math.random() - 0.5) * 0.0008 * S
        eng.base = Math.max(CFG.BASE_LEVEL * 0.2, Math.min(CFG.BASE_LEVEL, eng.base))

        // ── SPIKE CLUSTER SYSTEM ──
        if (eng.clusterLeft > 0) {
          if (Math.random() < 0.55) {
            p = this.generateSpikeHeight()
            eng.lastSpikeH = p
            eng.clusterLeft--
            break
          } else {
            p = eng.base + (eng.lastSpikeH - eng.base) * (0.15 + Math.random() * 0.15)
            p += wobble * 0.5
            break
          }
        }

        // ── RETURNING FROM SPIKE ──
        if (eng.lastSpikeH > eng.base * 2) {
          p = eng.base + (this.rate - eng.base) * (0.25 + Math.random() * 0.2)
          eng.lastSpikeH *= 0.3
          p += wobble * 0.3
          if (Math.random() < 0.22) {
            eng.clusterLeft = 1 + Math.floor(Math.random() * 2)
          }
          break
        }

        // ── CALM WOBBLE ──
        p = eng.base + wobble
        p += (eng.base - this.rate) * 0.08
        eng.lastSpikeH = 0

        // ── NEW SPIKE CLUSTER TRIGGER ──
        const spikeChance = CFG.SPIKE_FREQ * 3.5
        if (Math.random() < spikeChance && eng.tick > 1) {
          const r = Math.random()
          if (r < 0.2) eng.clusterLeft = 1
          else if (r < 0.45) eng.clusterLeft = 2
          else if (r < 0.7) eng.clusterLeft = 3
          else if (r < 0.88) eng.clusterLeft = 4
          else eng.clusterLeft = 5

          p = this.generateSpikeHeight()
          eng.lastSpikeH = p
          eng.clusterLeft--
          eng.tick = 0
          break
        }
        break
      }

      case 'dip': {
        const dipScale = CFG.SPIKE_MAX || 0.105
        if (eng.tick === 1) {
          p = eng.dipTarget * (1.0 + Math.random() * 0.4)
        } else if (eng.tick < eng.dipLen) {
          p = eng.dipTarget + (Math.random() - 0.4) * 0.06 * dipScale
          if (Math.random() < 0.25) {
            p = eng.dipTarget * (1.1 + Math.random() * 0.3)
          }
        } else {
          p = eng.base + (Math.random() - 0.3) * 0.02 * dipScale
          if (Math.random() < 0.4) {
            p = this.generateSpikeHeight() * (0.3 + Math.random() * 0.4)
          }
          eng.mode = 'active'
          eng.tick = 0
        }
        break
      }

      case 'crash': {
        p += (eng.crashFloor - p) * (0.5 + Math.random() * 0.3)
        if (p <= eng.crashFloor * 0.7) {
          eng.mode = 'crash_floor'
          eng.tick = 0
          eng.crashTicks = 10 + Math.floor(Math.random() * 18)
          eng.crashBounces = 2 + Math.floor(Math.random() * 3)
        }
        break
      }

      case 'crash_floor': {
        const S = CFG.SCALE
        if (eng.crashBounces > 0 && Math.random() < 0.15) {
          p = eng.crashFloor + (0.012 + Math.random() * 0.025) * S
          eng.crashBounces--
        } else {
          p = eng.crashFloor + (Math.random() - 0.3) * 0.006 * S
          p += (eng.crashFloor - p) * 0.12
        }
        if (eng.tick >= eng.crashTicks) {
          eng.mode = 'recover'
          eng.tick = 0
        }
        break
      }

      case 'recover': {
        const S = CFG.SCALE
        p += (eng.base - p) * (0.1 + Math.random() * 0.06)
        if (Math.random() < 0.12 && p > -0.01 * S) {
          p += (0.008 + Math.random() * 0.015) * S
        }
        if (p >= eng.base * 0.5 && eng.tick > 6) {
          eng.mode = 'active'
          eng.tick = 0
          eng.lastSpikeH = 0
          eng.clusterLeft = 0
        }
        break
      }
    }

    // Final micro noise
    p += (Math.random() - 0.5) * 0.0008 * CFG.SCALE

    // Clamp to just beyond the visible axis (lets crashes touch the floor slightly)
    p = Math.max(CFG.CRASH_DEPTH * 1.2, Math.min(CFG.Y_MAX * 1.25, p))

    this.prevRate = this.rate
    this.rate = p
    if (p > this.high24) this.high24 = p
    if (p < this.low24) this.low24 = p
    return p
  }
}
