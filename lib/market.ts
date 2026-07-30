type Candle = {
  time: number
  open: number
  high: number
  low: number
  close: number
}

class MarketEngine {
  private price = 100

  private candles: Candle[] = []

  private currentCandle: Candle | null = null

  private readonly candleDuration = 60

  private readonly visibleHistory = 300

  private readonly maxHistory = 1000

  // -------- MARKET STATE --------

  private drift = 0

  private trend = 0

  private volatility = 0.08

  constructor() {
    this.seed()
  }

  private currentBucket(): number {
    return (
      Math.floor(Date.now() / 1000 / this.candleDuration) *
      this.candleDuration
    )
  }

  
    private nextPrice() {

  // Change trend roughly every minute
  if (Math.random() < 0.015) {

    this.trend =
      (Math.random() - 0.5) * 0.04

    this.volatility =
      0.015 + Math.random() * 0.02
  }

  // Smooth momentum
  this.drift =
    this.drift * 0.985 +
    this.trend * 0.015

  // Small random movement
  const noise =
    (Math.random() - 0.5) *
    this.volatility

  this.price +=
    this.drift +
    noise

  return this.price
}

  private seed() {
    let price = this.price

    const bucket =
      this.currentBucket()

    for (
      let i = this.maxHistory;
      i > 0;
      i--
    ) {
      const time =
        bucket -
        i * this.candleDuration

      const open = price

      const move =
        (Math.random() - 0.5) * 0.35

      const close =
        open + move

      const wickUp =
        Math.random() * 0.18

      const wickDown =
        Math.random() * 0.18

      const candle: Candle = {
        time,
        open,
        high:
          Math.max(open, close) +
          wickUp,
        low:
          Math.min(open, close) -
          wickDown,
        close,
      }

      this.candles.push(candle)

      price = close
    }

    this.price = price

    const last =
      this.candles[
        this.candles.length - 1
      ]

    this.currentCandle = {
      time: bucket,
      open: last.close,
      high: last.close,
      low: last.close,
      close: last.close,
    }

    this.candles.push(
      this.currentCandle
    )
  }
next(): Candle {
  const bucket = this.currentBucket()

  // Create new candle
  if (
    !this.currentCandle ||
    this.currentCandle.time !== bucket
  ) {
    const previousClose = this.currentCandle
      ? this.currentCandle.close
      : this.price

    this.currentCandle = {
      time: bucket,
      open: previousClose,
      high: previousClose,
      low: previousClose,
      close: previousClose,
    }

    this.candles.push(this.currentCandle)

    while (this.candles.length > this.maxHistory) {
      this.candles.shift()
    }
  }

  // Generate new price
  let price = this.nextPrice()

  // ----------------------------------
  // LIMIT PRICE MOVEMENT
  // ----------------------------------

  const MAX_MOVE = 2.0

  const upper =
    this.currentCandle.open + MAX_MOVE

  const lower =
    this.currentCandle.open - MAX_MOVE

  if (price > upper) {
    price = upper
    this.price = upper
  }

  if (price < lower) {
    price = lower
    this.price = lower
  }

  // ----------------------------------

  this.currentCandle.close = price

  this.currentCandle.high = Math.max(
    this.currentCandle.high,
    price
  )

  this.currentCandle.low = Math.min(
    this.currentCandle.low,
    price
  )

  return {
    ...this.currentCandle,
  }
}

  getCandles() {
    return this.candles.slice(
      -this.visibleHistory
    )
  }

  getPrice() {
    return this.price
  }
}

export const market =
  new MarketEngine()