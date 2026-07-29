'use client'

import { useEffect, useRef, forwardRef, useImperativeHandle } from 'react'
import {
  createChart, CandlestickSeries, ColorType, CrosshairMode, LineStyle,
  type UTCTimestamp, type IChartApi, type ISeriesApi,
  type IPriceLine,
} from 'lightweight-charts'

interface HistoricalCandle {
  time_open: string
  open: number; high: number; low: number; close: number
}

interface LiveCandle {
  time: number; open: number; high: number; low: number; close: number
}

export interface TickPayload {
  price: number
  candle: LiveCandle
  regime: 'uptrend' | 'downtrend' | 'ranging'
}

export interface CandleChartHandle {
  zoomIn: () => void
  zoomOut: () => void
  fitContent: () => void
  scrollToLatest: () => void
}

interface Props {
  historicalCandles: HistoricalCandle[]
  pairId: string
  candleDuration: number
  onTick?: (payload: TickPayload) => void
  streamUrl?: string
  entryPrice?: number | null
  visibleCandles?: number
}

const TZ_OFFSET_SEC = 3 * 3600
const toLocal = (utcSec: number): UTCTimestamp => (utcSec + TZ_OFFSET_SEC) as UTCTimestamp

type Bar = { time: UTCTimestamp; open: number; high: number; low: number; close: number }

function cleanBars(raw: Bar[]): Bar[] {
  const map = new Map<number, Bar>()
  for (const bar of raw) map.set(bar.time as number, bar)
  return [...map.values()].sort((a, b) => (a.time as number) - (b.time as number))
}

function fillClientGaps(bars: Bar[], candleDurationSec: number): Bar[] {
  if (bars.length < 2) return bars
  const out: Bar[] = [bars[0]]
  for (let i = 1; i < bars.length; i++) {
    const prevT = out[out.length - 1].time as number
    const currT = bars[i].time as number
    const p     = out[out.length - 1].close
    for (let t = prevT + candleDurationSec; t < currT; t += candleDurationSec) {
      out.push({ time: t as UTCTimestamp, open: p, high: p, low: p, close: p })
    }
    out.push(bars[i])
  }
  return out
}

const CandleChart = forwardRef<CandleChartHandle, Props>(function CandleChart(
  { historicalCandles, pairId, candleDuration, onTick, streamUrl = '/api/admin/chart/stream', entryPrice, visibleCandles = 60 },
  ref
) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef     = useRef<IChartApi | null>(null)
  const seriesRef    = useRef<ISeriesApi<'Candlestick'> | null>(null)
  const esRef        = useRef<EventSource | null>(null)
  const onTickRef    = useRef(onTick)
  const entryLineRef = useRef<IPriceLine | null>(null)

  const userScrolledRef      = useRef(false)
  const programmingScrollRef = useRef(false)
  const barSpacingRef        = useRef(10)
  const lastHistBarTimeRef   = useRef<number>(0)

  useEffect(() => { onTickRef.current = onTick }, [onTick])

  useImperativeHandle(ref, () => ({
    zoomIn() {
      const chart = chartRef.current
      if (!chart) return
      barSpacingRef.current = Math.min(barSpacingRef.current * 1.35, 80)
      chart.timeScale().applyOptions({ barSpacing: barSpacingRef.current })
    },
    zoomOut() {
      const chart = chartRef.current
      if (!chart) return
      barSpacingRef.current = Math.max(barSpacingRef.current / 1.35, 2)
      chart.timeScale().applyOptions({ barSpacing: barSpacingRef.current })
    },
    fitContent() {
      const chart = chartRef.current
      if (!chart) return
      userScrolledRef.current = false
      programmingScrollRef.current = true
      chart.timeScale().fitContent()
      programmingScrollRef.current = false
    },
    scrollToLatest() {
      const chart = chartRef.current
      if (!chart) return
      userScrolledRef.current = false
      programmingScrollRef.current = true
      chart.timeScale().scrollToRealTime()
      programmingScrollRef.current = false
    },
  }))

  // ── 1. Create chart once on mount ────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return
    const el = containerRef.current

    const chart = createChart(el, {
      width: el.clientWidth,
      height: el.clientHeight,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: 'rgb(148 163 184)',
      },
      grid: {
        vertLines: { color: 'rgba(148,163,184,0.08)' },
        horzLines: { color: 'rgba(148,163,184,0.08)' },
      },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: {
        borderColor: 'rgba(148,163,184,0.15)',
        scaleMargins: { top: 0.08, bottom: 0.08 },
        minimumWidth: 90,
      },
      timeScale: {
        borderColor: 'rgba(148,163,184,0.15)',
        timeVisible: true,
        secondsVisible: candleDuration < 60,
        rightOffset: 8,
        barSpacing: barSpacingRef.current,
      },
      handleScroll: true,
      handleScale: true,
    })

    const series = chart.addSeries(CandlestickSeries, {
      upColor:         '#22c55e',
      downColor:       '#ef4444',
      borderUpColor:   '#22c55e',
      borderDownColor: '#ef4444',
      wickUpColor:     '#4ade80',
      wickDownColor:   '#f87171',
      priceFormat: {
        type: 'price',
        precision: 5,
        minMove: 0.00001,
      },
    })

    chartRef.current  = chart
    seriesRef.current = series

    chart.timeScale().subscribeVisibleLogicalRangeChange((range) => {
      if (!programmingScrollRef.current) {
        userScrolledRef.current = true

        // Clamp left edge: don't scroll past the first candle
        if (range && range.from < 0) {
          const width = range.to - range.from
          programmingScrollRef.current = true
          chart.timeScale().setVisibleLogicalRange({ from: 0, to: width })
          programmingScrollRef.current = false
        }
      }
    })

    const observer = new ResizeObserver(() => {
      chart.applyOptions({ width: el.clientWidth, height: el.clientHeight })
    })
    observer.observe(el)

    return () => {
      observer.disconnect()
      chart.remove()
      chartRef.current  = null
      seriesRef.current = null
      entryLineRef.current = null
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── 2. Load historical candles ────────────────────────────────────────
  useEffect(() => {
    const series = seriesRef.current
    const chart  = chartRef.current
    if (!series || !chart) return

    userScrolledRef.current = false

    if (historicalCandles.length === 0) {
      series.setData([])
      return
    }

    const raw = historicalCandles.map(c => ({
      time:  toLocal(Math.floor(new Date(c.time_open).getTime() / 1000)),
      open:  Number(c.open),
      high:  Number(c.high),
      low:   Number(c.low),
      close: Number(c.close),
    }))

    const data = fillClientGaps(cleanBars(raw), candleDuration)
    series.setData(data)
    lastHistBarTimeRef.current = data.length > 0 ? (data[data.length - 1].time as number) : 0

    programmingScrollRef.current = true
    const last = data.length - 1
    if (data.length >= visibleCandles) {
      chart.timeScale().setVisibleLogicalRange({
        from: last - (visibleCandles - 1),
        to:   last + Math.round(visibleCandles * 0.12),
      })
    } else {
      // Fewer candles than the visible window — just fit and pin to the right
      chart.timeScale().scrollToRealTime()
    }
    programmingScrollRef.current = false
  }, [historicalCandles])

  // ── 3. SSE subscription with auto-reconnect ───────────────────────────
  useEffect(() => {
    if (!pairId) return

    let retryTimer: ReturnType<typeof setTimeout> | null = null
    let retryDelay = 1000
    let destroyed = false
    let lastKnownPrice: number | null = null

    function connect() {
      if (destroyed) return
      esRef.current?.close()

      const es = new EventSource(`${streamUrl}?pair_id=${encodeURIComponent(pairId)}`)
      esRef.current = es

      es.onmessage = (event) => {
        retryDelay = 1000 // reset backoff on success
        const payload: TickPayload = JSON.parse(event.data)
        const series = seriesRef.current
        const chart  = chartRef.current

        if (series && payload.candle) {
          // Skip ticks strictly older than the last historical bar — causes "cannot update oldest data"
          // Allow equal (current candle) and newer through
          if (lastHistBarTimeRef.current > 0 && (payload.candle.time as number) < lastHistBarTimeRef.current) return

          // On reconnect: if the new price is suspiciously far from last known price
          // (>0.5% gap), patch the open of the incoming candle to avoid visual jump
          if (lastKnownPrice !== null) {
            const pctDiff = Math.abs(payload.candle.open - lastKnownPrice) / lastKnownPrice
            if (pctDiff > 0.005) {
              payload.candle.open = lastKnownPrice
              if (payload.candle.low > lastKnownPrice) payload.candle.low = lastKnownPrice
              if (payload.candle.high < lastKnownPrice) payload.candle.high = lastKnownPrice
            }
          }
          lastKnownPrice = payload.candle.close

          const updateBar = {
            time:  payload.candle.time as UTCTimestamp,
            open:  payload.candle.open,
            high:  payload.candle.high,
            low:   payload.candle.low,
            close: payload.candle.close,
          }
          try {
            series.update(updateBar)
          } catch { /* stale tick — ignore */ }

          if (!userScrolledRef.current && chart) {
            programmingScrollRef.current = true
            chart.timeScale().scrollToRealTime()
            programmingScrollRef.current = false
          }
        }

        onTickRef.current?.(payload)
      }

      es.onerror = () => {
        es.close()
        if (!destroyed) {
          retryTimer = setTimeout(() => {
            retryDelay = Math.min(retryDelay * 2, 15000)
            connect()
          }, retryDelay)
        }
      }
    }

    connect()

    return () => {
      destroyed = true
      if (retryTimer) clearTimeout(retryTimer)
      esRef.current?.close()
      esRef.current = null
    }
  }, [pairId, streamUrl])

  // ── 4. Entry price horizontal line ────────────────────────────────────
  useEffect(() => {
    const series = seriesRef.current
    if (!series) return

    // Remove old line
    if (entryLineRef.current) {
      try { series.removePriceLine(entryLineRef.current) } catch {}
      entryLineRef.current = null
    }

    if (entryPrice && entryPrice > 0) {
      entryLineRef.current = series.createPriceLine({
        price: entryPrice,
        color: '#f59e0b',
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: 'ENTRY',
      })
    }
  }, [entryPrice])

  return <div ref={containerRef} className="w-full h-full min-h-0" />
})

export default CandleChart
