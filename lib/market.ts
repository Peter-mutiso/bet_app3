type Candle = {
  time: number; // Unix timestamp (seconds)
  open: number;
  high: number;
  low: number;
  close: number;
};

class MarketEngine {
  private price = 100;
  private candles: Candle[] = [];
  private currentCandle: Candle | null = null;

  // One candle every 60 seconds
  private readonly candleDuration = 60;

  // Number of candles sent to the frontend
  private readonly visibleHistory = 50;

  // Number of candles kept in memory
  private readonly maxHistory = 300;

  constructor() {
    this.seed();
  }

  /**
   * Returns the current candle bucket.
   * Example:
   * 12:01:34 -> 12:01:00
   */
  private currentBucket(): number {
    return (
      Math.floor(Date.now() / 1000 / this.candleDuration) *
      this.candleDuration
    );
  }

  /**
   * Generate historical candles.
   */
  private seed() {
    let price = this.price;
    const nowBucket = this.currentBucket();

    // Generate 300 historical candles
    for (let i = this.maxHistory; i > 0; i--) {
      const time = nowBucket - i * this.candleDuration;

      const open = price;
      const close = open + (Math.random() - 0.5) * 2;

      const candle: Candle = {
        time,
        open,
        high: Math.max(open, close) + Math.random() * 0.5,
        low: Math.min(open, close) - Math.random() * 0.5,
        close,
      };

      this.candles.push(candle);
      price = close;
    }

    this.price = price;

    // Create the current live candle
    const last = this.candles[this.candles.length - 1];

    this.currentCandle = {
      time: nowBucket,
      open: last.close,
      high: last.close,
      low: last.close,
      close: last.close,
    };

    this.candles.push(this.currentCandle);

    // Keep only maxHistory candles
    while (this.candles.length > this.maxHistory) {
      this.candles.shift();
    }
  }

  /**
   * Called every second.
   */
  next(): Candle {
    // Small random movement
    this.price += (Math.random() - 0.5) * 0.5;

    const bucket = this.currentBucket();

    // Start a new candle every minute
    if (!this.currentCandle || this.currentCandle.time !== bucket) {
      const previousClose = this.currentCandle
        ? this.currentCandle.close
        : this.price;

      this.currentCandle = {
        time: bucket,
        open: previousClose,
        high: previousClose,
        low: previousClose,
        close: previousClose,
      };

      this.candles.push(this.currentCandle);

      // Keep only the latest maxHistory candles
      while (this.candles.length > this.maxHistory) {
        this.candles.shift();
      }
    }

    // Update live candle
    this.currentCandle.close = this.price;
    this.currentCandle.high = Math.max(
      this.currentCandle.high,
      this.price
    );
    this.currentCandle.low = Math.min(
      this.currentCandle.low,
      this.price
    );

    return {
      ...this.currentCandle,
    };
  }

  /**
   * Returns only the latest visible candles.
   */
  getCandles(): Candle[] {
    const candles = this.candles.slice(-this.visibleHistory);

    console.log(
      `MarketEngine: ${this.candles.length} total, ${candles.length} returned`
    );

    return [...candles];
  }

  /**
   * Current market price.
   */
  getPrice(): number {
    return this.price;
  }
}

export const market = new MarketEngine();