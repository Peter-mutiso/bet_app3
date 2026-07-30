'use client'

import {
  useEffect,
  useRef,
  forwardRef,
  useImperativeHandle,
} from 'react'

import {
  createChart,
  CandlestickSeries,
  ColorType,
  CrosshairMode,
  LineStyle,
  type IChartApi,
  type ISeriesApi,
  type IPriceLine,
  type UTCTimestamp,
} from 'lightweight-charts'

/* ============================================================
   TYPES
============================================================ */

interface LiveCandle {
  time: number
  open: number
  high: number
  low: number
  close: number
}

export interface TickPayload {
  price: number
  candle: LiveCandle
  regime: 'uptrend' | 'downtrend' | 'ranging'
}

export interface CandleChartHandle {
  zoomIn(): void
  zoomOut(): void
  fitContent(): void
  scrollToLatest(): void
}

interface HistoricalCandle {
  time_open: string
  open: number | string
  high: number | string
  low: number | string
  close: number | string
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

/* ============================================================
   HELPERS
============================================================ */

const TZ_OFFSET = 3 * 3600

const toLocal = (utc: number) =>
  (utc + TZ_OFFSET) as UTCTimestamp

type Bar = {
  time: UTCTimestamp
  open: number
  high: number
  low: number
  close: number
}

function cleanBars(bars: Bar[]) {
  const map = new Map<number, Bar>()

  for (const bar of bars) {
    map.set(bar.time as number, bar)
  }

  return [...map.values()].sort(
    (a, b) =>
      (a.time as number) -
      (b.time as number)
  )
}

function fillMissingBars(
  bars: Bar[],
  candleDuration: number,
) {
  if (bars.length < 2) return bars

  const out: Bar[] = [bars[0]]

  for (let i = 1; i < bars.length; i++) {
    const previous = out[out.length - 1]

    const previousTime =
      previous.time as number

    const currentTime =
      bars[i].time as number

    for (
      let t = previousTime + candleDuration;
      t < currentTime;
      t += candleDuration
    ) {
      out.push({
        time: t as UTCTimestamp,
        open: previous.close,
        high: previous.close,
        low: previous.close,
        close: previous.close,
      })
    }

    out.push(bars[i])
  }

  return out
}

/* ============================================================
   COMPONENT
============================================================ */

const CandleChart = forwardRef<
  CandleChartHandle,
  Props
>(function CandleChart(
  {
    historicalCandles,
    pairId,
    candleDuration,
    onTick,
    streamUrl = '/api/chart/stream',
    entryPrice,
    visibleCandles = 26,
  },
  ref,
) {
  const containerRef =
    useRef<HTMLDivElement>(null)

  const chartRef =
    useRef<IChartApi | null>(null)

  const seriesRef =
    useRef<ISeriesApi<'Candlestick'> | null>(
      null,
    )

  const esRef =
    useRef<EventSource | null>(null)

  const onTickRef =
    useRef(onTick)

  const entryLineRef =
    useRef<IPriceLine | null>(null)

  const userScrolled =
    useRef(false)

  const internalScroll =
    useRef(false)

  const barSpacing =
    useRef(10)

  const lastHistoryTime =
    useRef(0)

  const latestPrice =
    useRef<number | null>(null)

  useEffect(() => {
    onTickRef.current = onTick
  }, [onTick])

  useImperativeHandle(ref, () => ({
    zoomIn() {
      const chart = chartRef.current
      if (!chart) return

      barSpacing.current = Math.min(
    18,
    barSpacing.current + 1,
)

      chart.timeScale().applyOptions({
        barSpacing: barSpacing.current,
      })
    },

    zoomOut() {
      const chart = chartRef.current
      if (!chart) return

      barSpacing.current = Math.max(
    6,
    barSpacing.current - 1,
)

      chart.timeScale().applyOptions({
        barSpacing: barSpacing.current,
      })
    },

    fitContent() {
      const chart = chartRef.current
      if (!chart) return

      userScrolled.current = false

      internalScroll.current = true

      chart.timeScale().fitContent()

      const series = seriesRef.current

if (!series) return
const total = series.data().length

chart.timeScale().setVisibleLogicalRange({
    from: Math.max(0, total - visibleCandles),
    to: total,
})
      internalScroll.current = false
    },

    scrollToLatest() {
      const chart = chartRef.current
      if (!chart) return

      userScrolled.current = false

      internalScroll.current = true

      chart.timeScale().scrollToRealTime()

      internalScroll.current = false
    },
  }))

  /* ============================================================
     CREATE CHART
  ============================================================ */

  useEffect(() => {
    if (!containerRef.current) return

    const chart = createChart(
      containerRef.current,
      {
        width:
          containerRef.current.clientWidth,

        height:
          containerRef.current.clientHeight,

        layout: {
          background: {
            type: ColorType.Solid,
            color: '#0b1220',
          },
          textColor: '#94a3b8',
        },

        grid: {
          vertLines: {
            color:
              'rgba(255,255,255,0.05)',
          },
          horzLines: {
            color:
              'rgba(255,255,255,0.05)',
          },
        },

        crosshair: {
          mode: CrosshairMode.Normal,

          vertLine: {
            width: 1,
            style: LineStyle.Dashed,
            color: '#64748b',
          },

          horzLine: {
            width: 1,
            style: LineStyle.Dashed,
            color: '#64748b',
          },
        },

        rightPriceScale: {
  borderVisible: false,
  scaleMargins: {
    top: 0.02,
    bottom: 0.02,
  },
},

        timeScale: {
    borderVisible: false,
    timeVisible: true,
    secondsVisible: candleDuration < 60,

    rightOffset: 0,

    barSpacing: 10,

    minBarSpacing: 4,

    fixLeftEdge: false,

    lockVisibleTimeRangeOnResize: true,

    rightBarStaysOnScroll: true,
},

        handleScroll: true,

        handleScale: true,
      },
    )

    const series = chart.addSeries(
      CandlestickSeries,
      {
        upColor: '#22c55e',

        downColor: '#ef4444',

        borderUpColor: '#22c55e',

        borderDownColor: '#ef4444',

        wickUpColor: '#22c55e',

        wickDownColor: '#ef4444',

        borderVisible: true,

        priceFormat: {
          type: 'price',
          precision: 5,
          minMove: 0.00001,
        },
      },
    )

    chartRef.current = chart
    seriesRef.current = series

    chart
      .timeScale()
      .subscribeVisibleLogicalRangeChange(
        (range) => {
          if (internalScroll.current) return

          userScrolled.current = true

          if (!range) return

          if (range.from < 0) {
            internalScroll.current = true

            chart
              .timeScale()
              .setVisibleLogicalRange({
                from: 0,
                to: range.to - range.from,
              })

            internalScroll.current = false
          }
        },
      )

    const observer =
      new ResizeObserver(() => {
        chart.applyOptions({
          width:
            containerRef.current
              ?.clientWidth,
          height:
            containerRef.current
              ?.clientHeight,
        })
      })

    observer.observe(containerRef.current)

    return () => {
      observer.disconnect()

      chart.remove()

      chartRef.current = null

      seriesRef.current = null

      entryLineRef.current = null
    }
  }, [])
    /* ============================================================
     LOAD HISTORICAL CANDLES
  ============================================================ */

  useEffect(() => {
    const chart = chartRef.current
    const series = seriesRef.current

    if (
      !chart ||
      !series ||
      historicalCandles.length === 0
    )
      return

    const bars = fillMissingBars(
      cleanBars(
        historicalCandles.map((c) => ({
          time: toLocal(
            Math.floor(
              new Date(c.time_open).getTime() /
                1000,
            ),
          ),

          open: Number(c.open),

          high: Number(c.high),

          low: Number(c.low),

          close: Number(c.close),
        })),
      ),
      candleDuration,
    )

    series.setData(bars)
    chart.timeScale().fitContent()

    lastHistoryTime.current =
      bars[bars.length - 1].time as number

    latestPrice.current =
      bars[bars.length - 1].close

    const totalBars = bars.length

    internalScroll.current = true

    chart.timeScale().setVisibleLogicalRange({
    from: totalBars - 26,
    to: totalBars,
})

    internalScroll.current = false
  }, [
    historicalCandles,
    candleDuration,
    visibleCandles,
  ])

  /* ============================================================
     LIVE STREAM
  ============================================================ */

  useEffect(() => {
    if (!pairId) return

    let reconnectTimer:
      | ReturnType<typeof setTimeout>
      | null = null

    let reconnectDelay = 1000

    let closed = false

    function connect() {
      if (closed) return

      esRef.current?.close()

      const es = new EventSource(
        `${streamUrl}?pair_id=${encodeURIComponent(
          pairId,
        )}`,
      )

      esRef.current = es

      es.onopen = () => {
        reconnectDelay = 1000
      }

      es.onmessage = (event) => {
        const payload: TickPayload =
          JSON.parse(event.data)

        const chart = chartRef.current

        const series = seriesRef.current

        if (!chart || !series) return

        const candle = payload.candle

        const liveTime =
          toLocal(candle.time) as number

        if (
          lastHistoryTime.current &&
          liveTime <
            lastHistoryTime.current
        ) {
          return
        }

        let open = candle.open

        if (
          latestPrice.current !== null
        ) {
          const jump =
            Math.abs(
              open -
                latestPrice.current,
            ) /
            latestPrice.current

          if (jump > 0.0035) {
            open = latestPrice.current
          }
        }

        const update = {
          time: toLocal(
            candle.time,
          ) as UTCTimestamp,

          open,

          high: Math.max(
            candle.high,
            open,
            candle.close,
          ),

          low: Math.min(
            candle.low,
            open,
            candle.close,
          ),

          close: candle.close,
        }

        latestPrice.current =
          candle.close

        try {
          series.update(update)
        } catch {}
        chart.timeScale().scrollToRealTime()

chart.timeScale().applyOptions({
  rightOffset: 0,
})

        if (
          !userScrolled.current
        ) {
          internalScroll.current =
            true

          chart
            .timeScale()
            .scrollToRealTime()

          internalScroll.current =
            false
        }

        onTickRef.current?.(payload)
      }

      es.onerror = () => {
        es.close()

        if (closed) return

        reconnectTimer =
          setTimeout(() => {
            reconnectDelay = Math.min(
              reconnectDelay * 2,
              10000,
            )

            connect()
          }, reconnectDelay)
      }
    }

    connect()

    return () => {
      closed = true

      if (reconnectTimer)
        clearTimeout(
          reconnectTimer,
        )

      esRef.current?.close()

      esRef.current = null
    }
  }, [
    pairId,
    streamUrl,
  ])
    /* ============================================================
     ENTRY PRICE LINE
  ============================================================ */

  useEffect(() => {
    const series = seriesRef.current

    if (!series) return

    // Remove previous entry line
    if (entryLineRef.current) {
      try {
        series.removePriceLine(entryLineRef.current)
      } catch {}

      entryLineRef.current = null
    }

    if (!entryPrice) return

    entryLineRef.current = series.createPriceLine({
      price: entryPrice,

      color: '#f59e0b',

      lineWidth: 2,

      lineStyle: LineStyle.Dashed,

      axisLabelVisible: true,

      title: 'ENTRY',
    })
  }, [entryPrice])

  /* ============================================================
     RENDER
  ============================================================ */

  return (
    <div
      ref={containerRef}
      className="w-full h-full bg-[#0b1220]"
    />
  )
})

CandleChart.displayName = 'CandleChart'

export default CandleChart