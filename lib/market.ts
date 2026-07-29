type Candle = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
};

class MarketEngine {
  private price = 100;
  private candles: Candle[] = [];

  constructor() {
    this.seed();
  }

  private seed() {
    let p = this.price;

    for (let i = 0; i < 100; i++) {
      const open = p;
      const close = open + (Math.random() - 0.5) * 3;

      this.candles.push({
        time: Date.now() - (100 - i) * 60000,
        open,
        high: Math.max(open, close) + Math.random(),
        low: Math.min(open, close) - Math.random(),
        close,
      });

      p = close;
    }

    this.price = p;
  }

  next() {
    const open = this.price;
    const close = open + (Math.random() - 0.5) * 2;

    const candle = {
      time: Date.now(),
      open,
      high: Math.max(open, close) + Math.random(),
      low: Math.min(open, close) - Math.random(),
      close,
    };

    this.price = close;

    this.candles.push(candle);

    if (this.candles.length > 300)
      this.candles.shift();

    return candle;
  }

  getCandles() {
    return this.candles;
  }

  getPrice() {
    return this.price;
  }
}

export const market = new MarketEngine();