import { logger } from "../utils/logger";

interface PriceData {
  symbol: string;
  price: number;
  change24h: number;
  volume24h: number;
  timestamp: Date;
}

interface ExchangeRate {
  from: string;
  to: string;
  rate: number;
  timestamp: Date;
}

/**
 * MarketDataService
 * Integrates with Crypto.com Market Data MCP Server for real-time rates
 */
export class MarketDataService {
  private mcpEndpoint: string;
  private cache: Map<string, { data: any; expiry: Date }>;
  private cacheTTL: number = 30000; // 30 seconds

  // Fallback exchange rates (used when MCP unavailable)
  private fallbackRates: Record<string, number> = {
    "USD/NGN": 1550,
    "USD/KES": 154,
    "USD/ZAR": 18.5,
    "USD/GHS": 15.2,
    "USD/TZS": 2700,
    "USD/UGX": 3800,
    "USD/EGP": 50,
    "USD/MAD": 10,
    "USD/XOF": 620,
    "USD/GBP": 0.79,
    "USD/EUR": 0.92,
  };

  constructor(mcpEndpoint?: string) {
    this.mcpEndpoint = mcpEndpoint || process.env.CRYPTO_COM_MCP_ENDPOINT || "https://mcp.crypto.com";
    this.cache = new Map();
  }

  /**
   * Get cryptocurrency price from Crypto.com
   */
  async getCryptoPrice(symbol: string): Promise<PriceData> {
    const cacheKey = `price:${symbol}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const response = await fetch(`${this.mcpEndpoint}/v1/ticker/price?symbol=${symbol}`);
      
      if (!response.ok) {
        throw new Error(`MCP API error: ${response.status}`);
      }

      const data = await response.json();

      const priceData: PriceData = {
        symbol: data.symbol,
        price: parseFloat(data.price),
        change24h: parseFloat(data.change_24h || 0),
        volume24h: parseFloat(data.volume_24h || 0),
        timestamp: new Date(),
      };

      this.setCache(cacheKey, priceData);
      return priceData;
    } catch (error) {
      logger.error("Failed to fetch crypto price", { symbol, error });
      
      // Return mock data for development
      return {
        symbol,
        price: symbol === "CRO" ? 0.12 : 1,
        change24h: 0,
        volume24h: 0,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Get exchange rate between currencies
   */
  async getExchangeRate(from: string, to: string): Promise<number> {
    const cacheKey = `rate:${from}/${to}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      // Try Crypto.com MCP first
      const response = await fetch(
        `${this.mcpEndpoint}/v1/exchange-rate?from=${from}&to=${to}`
      );

      if (response.ok) {
        const data = await response.json();
        const rate = parseFloat(data.rate);
        this.setCache(cacheKey, rate);
        return rate;
      }
    } catch (error) {
      logger.warn("MCP exchange rate unavailable, using fallback", { from, to });
    }

    // Use fallback rates
    const key = `${from}/${to}`;
    const reverseKey = `${to}/${from}`;

    if (this.fallbackRates[key]) {
      this.setCache(cacheKey, this.fallbackRates[key]);
      return this.fallbackRates[key];
    }

    if (this.fallbackRates[reverseKey]) {
      const rate = 1 / this.fallbackRates[reverseKey];
      this.setCache(cacheKey, rate);
      return rate;
    }

    // Default to 1:1 if no rate found
    logger.warn("No exchange rate found, defaulting to 1:1", { from, to });
    return 1;
  }

  /**
   * Get multiple exchange rates in batch
   */
  async getBatchExchangeRates(
    pairs: Array<{ from: string; to: string }>
  ): Promise<ExchangeRate[]> {
    const results = await Promise.all(
      pairs.map(async (pair) => ({
        from: pair.from,
        to: pair.to,
        rate: await this.getExchangeRate(pair.from, pair.to),
        timestamp: new Date(),
      }))
    );

    return results;
  }

  /**
   * Get market overview for African corridors
   */
  async getAfricanMarketOverview(): Promise<Record<string, ExchangeRate>> {
    const currencies = ["NGN", "KES", "ZAR", "GHS", "TZS", "UGX", "EGP", "MAD"];

    const rates: Record<string, ExchangeRate> = {};

    for (const currency of currencies) {
      rates[currency] = {
        from: "USD",
        to: currency,
        rate: await this.getExchangeRate("USD", currency),
        timestamp: new Date(),
      };
    }

    return rates;
  }

  /**
   * Subscribe to real-time price updates (WebSocket)
   */
  subscribeToUpdates(
    symbols: string[],
    callback: (data: PriceData) => void
  ): () => void {
    // In production, this would use WebSocket connection to Crypto.com
    // For now, simulate with polling
    const interval = setInterval(async () => {
      for (const symbol of symbols) {
        try {
          const price = await this.getCryptoPrice(symbol);
          callback(price);
        } catch (error) {
          logger.error("Price update failed", { symbol, error });
        }
      }
    }, 10000); // Poll every 10 seconds

    return () => clearInterval(interval);
  }

  /**
   * Calculate payment amount with optimal routing
   */
  async calculatePaymentAmount(params: {
    sendAmount: number;
    sendCurrency: string;
    receiveCurrency: string;
    includeFee?: boolean;
  }): Promise<{
    sendAmount: number;
    sendCurrency: string;
    receiveAmount: number;
    receiveCurrency: string;
    exchangeRate: number;
    fee: number;
    totalCost: number;
  }> {
    const { sendAmount, sendCurrency, receiveCurrency, includeFee = true } = params;

    const rate = await this.getExchangeRate(sendCurrency, receiveCurrency);
    const fee = includeFee ? sendAmount * 0.001 : 0; // 0.1% fee
    const netAmount = sendAmount - fee;
    const receiveAmount = netAmount * rate;

    return {
      sendAmount,
      sendCurrency,
      receiveAmount: parseFloat(receiveAmount.toFixed(2)),
      receiveCurrency,
      exchangeRate: rate,
      fee,
      totalCost: sendAmount,
    };
  }

  // Cache helpers
  private getFromCache(key: string): any | null {
    const cached = this.cache.get(key);
    if (cached && cached.expiry > new Date()) {
      return cached.data;
    }
    return null;
  }

  private setCache(key: string, data: any): void {
    this.cache.set(key, {
      data,
      expiry: new Date(Date.now() + this.cacheTTL),
    });
  }

  clearCache(): void {
    this.cache.clear();
  }
}
